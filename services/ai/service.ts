import { getAIConfig, type AIConfig } from "./config";
import { createOpenAIProvider } from "./openai";
import { createGeminiProvider } from "./gemini";
import {
  NoEngineAvailableError,
  type AICandidate,
  type AIEngine,
  type AIImage,
  type AIProvider,
} from "./types";

/**
 * AI identification orchestrator (#19, design D2). Selects the configured default
 * engine and, on failure/timeout/not-configured with fallback enabled,
 * automatically retries the secondary engine — sequentially, never in parallel
 * (resilience, not consensus). The engine that answered is recorded on every
 * candidate as `sourceProvider` during normalization.
 *
 * Engines, config, and the clock are injectable (matching `EnrichDeps`) so the
 * orchestrator is fully unit-tested with no network and no real API keys.
 */

const ALL_ENGINES: readonly AIEngine[] = ["openai", "gemini"];

/** Default per-call timeout (ms); a hang becomes a fallback trigger (design D2). */
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface AIServiceDeps {
  config?: () => Promise<AIConfig>;
  providers?: Partial<Record<AIEngine, AIProvider>>;
  timeoutMs?: number;
}

class TimeoutError extends Error {
  constructor(engine: AIEngine, ms: number) {
    super(`AI engine "${engine}" timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(
  engine: AIEngine,
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(engine, ms)), ms);
    fn().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function resolveProvider(
  engine: AIEngine,
  overrides?: Partial<Record<AIEngine, AIProvider>>,
): AIProvider {
  const override = overrides?.[engine];
  if (override) return override;
  return engine === "openai" ? createOpenAIProvider() : createGeminiProvider();
}

/**
 * Builds the ordered engine list: the default first, then the secondary when
 * fallback is enabled. With fallback disabled, only the default is attempted.
 */
function engineOrder(config: AIConfig): AIEngine[] {
  if (!config.fallbackEnabled) return [config.defaultEngine];
  const secondary = ALL_ENGINES.filter((e) => e !== config.defaultEngine);
  return [config.defaultEngine, ...secondary];
}

/**
 * Runs `call` against each engine in order. A configured engine that succeeds
 * returns its result. An engine that is not configured is skipped; one that
 * throws or times out advances to the next. When every candidate engine is
 * exhausted, the last error is re-thrown if fallback was disabled, otherwise a
 * `NoEngineAvailableError` is raised.
 */
async function runWithFallback<T>(
  deps: AIServiceDeps,
  call: (provider: AIProvider) => Promise<T>,
): Promise<T> {
  const config = await (deps.config ?? getAIConfig)();
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const order = engineOrder(config);

  let lastError: unknown = null;
  let attempted = false;

  for (const engine of order) {
    const provider = resolveProvider(engine, deps.providers);
    if (!provider.isConfigured()) continue;
    attempted = true;
    try {
      return await withTimeout(engine, timeoutMs, () => call(provider));
    } catch (err) {
      lastError = err;
      // Fallback disabled: surface the default engine's error directly.
      if (!config.fallbackEnabled) throw err;
    }
  }

  if (attempted && lastError) throw lastError;
  throw new NoEngineAvailableError();
}

/**
 * Identifies a single book from a cover/spine image. Returns `null` when an
 * engine ran successfully but recognized no book (a legitimate empty result, not
 * a fallback trigger). The returned candidate records which engine answered.
 */
export async function identifyBookFromImage(
  image: AIImage,
  deps: AIServiceDeps = {},
): Promise<AICandidate | null> {
  return runWithFallback(deps, (provider) =>
    provider.identifyBookFromImage(image),
  );
}

/**
 * Identifies multiple books from one shelf photo. Returns `[]` when an engine ran
 * but recognized none. Each candidate records which engine answered.
 */
export async function identifyBooksFromImage(
  image: AIImage,
  deps: AIServiceDeps = {},
): Promise<AICandidate[]> {
  return runWithFallback(deps, (provider) =>
    provider.identifyBooksFromImage(image),
  );
}
