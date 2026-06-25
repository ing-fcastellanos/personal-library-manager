import { describe, it, expect } from "vitest";
import { getAIConfig, DEFAULT_AI_CONFIG } from "./config";

describe("getAIConfig", () => {
  it("returns documented defaults when the document is absent", async () => {
    const config = await getAIConfig({ read: async () => null });
    expect(config).toEqual(DEFAULT_AI_CONFIG);
    expect(config).toEqual({ defaultEngine: "openai", fallbackEnabled: true });
  });

  it("honors a valid stored config", async () => {
    const config = await getAIConfig({
      read: async () => ({ defaultEngine: "gemini", fallbackEnabled: false }),
    });
    expect(config).toEqual({ defaultEngine: "gemini", fallbackEnabled: false });
  });

  it("falls back to default engine when the stored value is unknown", async () => {
    const config = await getAIConfig({
      // @ts-expect-error simulating a corrupt/legacy value
      read: async () => ({ defaultEngine: "claude", fallbackEnabled: false }),
    });
    expect(config.defaultEngine).toBe("openai");
    expect(config.fallbackEnabled).toBe(false);
  });

  it("defaults each field independently when one is missing", async () => {
    const config = await getAIConfig({
      read: async () => ({ defaultEngine: "gemini" }),
    });
    expect(config).toEqual({ defaultEngine: "gemini", fallbackEnabled: true });
  });

  it("ignores a non-boolean fallback value", async () => {
    const config = await getAIConfig({
      // @ts-expect-error simulating a corrupt value
      read: async () => ({ fallbackEnabled: "yes" }),
    });
    expect(config.fallbackEnabled).toBe(true);
  });
});
