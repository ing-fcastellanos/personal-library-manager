import { describe, it, expect } from "vitest";
import { getAIConfig, DEFAULT_AI_CONFIG } from "./config";

describe("getAIConfig", () => {
  it("returns documented defaults when the document is absent", async () => {
    const config = await getAIConfig({ read: async () => null });
    expect(config).toEqual(DEFAULT_AI_CONFIG);
    expect(config).toEqual({
      defaultEngine: "gemini",
      fallbackEnabled: true,
    });
  });

  it("honors a valid stored config", async () => {
    const config = await getAIConfig({
      read: async () => ({ defaultEngine: "gemini", fallbackEnabled: false }),
    });
    expect(config).toEqual({ defaultEngine: "gemini", fallbackEnabled: false });
  });

  it("accepts groq as a known engine", async () => {
    const config = await getAIConfig({
      read: async () => ({ defaultEngine: "groq" }),
    });
    expect(config.defaultEngine).toBe("groq");
  });

  it("falls back to default engine when the stored value is unknown", async () => {
    const config = await getAIConfig({
      // @ts-expect-error simulating a corrupt/legacy value
      read: async () => ({ defaultEngine: "claude", fallbackEnabled: true }),
    });
    expect(config.defaultEngine).toBe("gemini");
    expect(config.fallbackEnabled).toBe(true);
  });

  it("defaults each field independently when one is missing", async () => {
    const config = await getAIConfig({
      read: async () => ({ defaultEngine: "openai" }),
    });
    expect(config).toEqual({
      defaultEngine: "openai",
      fallbackEnabled: true,
    });
  });

  it("ignores a non-boolean fallback value", async () => {
    const config = await getAIConfig({
      // @ts-expect-error simulating a corrupt value
      read: async () => ({ fallbackEnabled: "yes" }),
    });
    expect(config.fallbackEnabled).toBe(true);
  });
});
