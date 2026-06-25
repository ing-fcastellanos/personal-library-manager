import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getAdminFirestore } from "../../lib/firebase/admin";
import { getAIConfig, type AIConfig } from "./config";
import { createOpenAIProvider } from "./openai";
import { createGeminiProvider } from "./gemini";
import type { AIEngine, AIProvider } from "./types";

/**
 * AI settings service (#19b, design D2/D3). Backs the settings screen: reads the
 * effective config plus a per-engine connection status, persists config changes
 * to the Firestore `settings/ai` document, and runs a lightweight connection
 * probe. It never reads, returns, or logs an API key — only the non-sensitive
 * config and a coarse status (design: keys stay server-side, #19a D5).
 *
 * `readSettings` is cheap: status is derived from `isConfigured()` alone (no
 * network). The live reachability check is the explicit `testEngine` probe so a
 * settings page load never spends an API call.
 */

export const ALL_ENGINES: readonly AIEngine[] = ["openai", "gemini"];

export type EngineConnectionStatus = "connected" | "not_configured" | "error";

export interface EngineStatus {
  engine: AIEngine;
  status: EngineConnectionStatus;
}

export interface AISettingsView {
  config: AIConfig;
  engines: EngineStatus[];
}

export interface SettingsPatch {
  defaultEngine?: AIEngine;
  fallbackEnabled?: boolean;
}

/** Per-engine probe timeout (ms); a hang maps to `error` (design D3 risk). */
export const PROBE_TIMEOUT_MS = 8_000;

export interface SettingsDeps {
  /** Effective config reader (defaults to `getAIConfig`). */
  config?: () => Promise<AIConfig>;
  /** Persists a partial config to `settings/ai` (merge). */
  persist?: (patch: SettingsPatch) => Promise<void>;
  /** Per-engine configured check (defaults to the real providers). */
  providers?: Partial<Record<AIEngine, Pick<AIProvider, "isConfigured">>>;
  /** Connection probe; throws/rejects on failure (defaults to a real SDK call). */
  probe?: (engine: AIEngine) => Promise<void>;
  timeoutMs?: number;
}

const persistDefault = async (patch: SettingsPatch): Promise<void> => {
  await getAdminFirestore()
    .collection("settings")
    .doc("ai")
    .set(patch, { merge: true });
};

function providerFor(
  engine: AIEngine,
  overrides?: SettingsDeps["providers"],
): Pick<AIProvider, "isConfigured"> {
  const override = overrides?.[engine];
  if (override) return override;
  return engine === "openai" ? createOpenAIProvider() : createGeminiProvider();
}

/** Cheapest authenticated call per SDK, purely to verify the credential works. */
const defaultProbe = async (engine: AIEngine): Promise<void> => {
  if (engine === "openai") {
    await new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    }).models.list();
  } else {
    await new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY ?? "",
    }).models.list();
  }
};

function withTimeout<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("probe timeout")), ms);
    fn().then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Reads the effective config and a cheap per-engine status (`not_configured`
 * when the key is absent, otherwise `connected`). Never runs a network probe and
 * never exposes a key.
 */
export async function readSettings(
  deps: SettingsDeps = {},
): Promise<AISettingsView> {
  const config = await (deps.config ?? getAIConfig)();
  const engines = ALL_ENGINES.map((engine) => ({
    engine,
    status: providerFor(engine, deps.providers).isConfigured()
      ? ("connected" as const)
      : ("not_configured" as const),
  }));
  return { config, engines };
}

/**
 * Validates and persists a config change, then returns the new effective config.
 * An unknown `defaultEngine` is rejected before any write.
 */
export async function writeSettings(
  patch: SettingsPatch,
  deps: SettingsDeps = {},
): Promise<AIConfig> {
  if (
    patch.defaultEngine !== undefined &&
    !ALL_ENGINES.includes(patch.defaultEngine)
  ) {
    throw new Error(`Unknown engine: ${patch.defaultEngine}`);
  }
  const persist = deps.persist ?? persistDefault;
  await persist(patch);
  return (deps.config ?? getAIConfig)();
}

/**
 * Probes an engine's reachability using the server-side key. Returns
 * `not_configured` when no key is present (without probing), `connected` on a
 * successful probe, or `error` when the probe fails or times out. No key value
 * is ever returned.
 */
export async function testEngine(
  engine: AIEngine,
  deps: SettingsDeps = {},
): Promise<EngineConnectionStatus> {
  if (!providerFor(engine, deps.providers).isConfigured()) {
    return "not_configured";
  }
  const probe = deps.probe ?? defaultProbe;
  const timeoutMs = deps.timeoutMs ?? PROBE_TIMEOUT_MS;
  try {
    await withTimeout(timeoutMs, () => probe(engine));
    return "connected";
  } catch {
    return "error";
  }
}
