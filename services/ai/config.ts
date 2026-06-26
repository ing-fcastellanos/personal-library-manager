import { getAdminFirestore } from "../../lib/firebase/admin";
import type { AIEngine } from "./types";

/**
 * AI engine configuration (#19, design D4). Read from the Firestore `settings/ai`
 * document so the engine choice can be changed from the app (the settings screen
 * #19b writes it). The config is non-sensitive — it holds NO API keys (those live
 * in Secret Manager, read server-side by the engine modules, design D5).
 *
 * The layer must work before the settings screen exists, so a missing document
 * (or missing/invalid fields) falls back to the documented defaults below.
 */

export interface AIConfig {
  defaultEngine: AIEngine;
  fallbackEnabled: boolean;
}

/** Used when `settings/ai` is absent or a field is missing/invalid (design D4). */
export const DEFAULT_AI_CONFIG: AIConfig = {
  defaultEngine: "openai",
  fallbackEnabled: true,
};

const KNOWN_ENGINES: readonly AIEngine[] = ["openai", "gemini"];

const COLLECTION = "settings";
const DOC_ID = "ai";

/** Reads the raw `settings/ai` doc; injectable so config logic is testable. */
export type AIConfigReader = () => Promise<Partial<AIConfig> | null>;

const firestoreReader: AIConfigReader = async () => {
  const doc = await getAdminFirestore()
    .collection(COLLECTION)
    .doc(DOC_ID)
    .get();
  if (!doc.exists) return null;
  return (doc.data() as Partial<AIConfig>) ?? null;
};

export interface AIConfigDeps {
  read?: AIConfigReader;
}

/**
 * Resolves the effective AI config, applying safe defaults for any
 * missing/invalid field. Never throws on a missing document.
 */
export async function getAIConfig(deps: AIConfigDeps = {}): Promise<AIConfig> {
  const read = deps.read ?? firestoreReader;
  const raw = (await read()) ?? {};

  const defaultEngine =
    raw.defaultEngine && KNOWN_ENGINES.includes(raw.defaultEngine)
      ? raw.defaultEngine
      : DEFAULT_AI_CONFIG.defaultEngine;

  const fallbackEnabled =
    typeof raw.fallbackEnabled === "boolean"
      ? raw.fallbackEnabled
      : DEFAULT_AI_CONFIG.fallbackEnabled;

  return { defaultEngine, fallbackEnabled };
}
