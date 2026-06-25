import { describe, it, expect, vi } from "vitest";
import {
  readSettings,
  writeSettings,
  testEngine,
  type SettingsDeps,
} from "./settings";
import type { AIEngine } from "./types";

const config =
  (defaultEngine: AIEngine, fallbackEnabled: boolean) => async () => ({
    defaultEngine,
    fallbackEnabled,
  });

const providers = (
  openaiKey: boolean,
  geminiKey: boolean,
): SettingsDeps["providers"] => ({
  openai: { isConfigured: () => openaiKey },
  gemini: { isConfigured: () => geminiKey },
});

describe("readSettings", () => {
  it("returns the effective config and a cheap per-engine status", async () => {
    const view = await readSettings({
      config: config("openai", true),
      providers: providers(true, false),
    });
    expect(view.config).toEqual({
      defaultEngine: "openai",
      fallbackEnabled: true,
    });
    expect(view.engines).toEqual([
      { engine: "openai", status: "connected" },
      { engine: "gemini", status: "not_configured" },
    ]);
  });

  it("does not run a network probe (status from isConfigured only)", async () => {
    const probe = vi.fn();
    await readSettings({
      config: config("gemini", false),
      providers: providers(true, true),
      probe,
    });
    expect(probe).not.toHaveBeenCalled();
  });
});

describe("writeSettings", () => {
  it("persists a valid patch and returns the new effective config", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const result = await writeSettings(
      { defaultEngine: "gemini" },
      { persist, config: config("gemini", true) },
    );
    expect(persist).toHaveBeenCalledWith({ defaultEngine: "gemini" });
    expect(result).toEqual({ defaultEngine: "gemini", fallbackEnabled: true });
  });

  it("rejects an unknown engine before persisting", async () => {
    const persist = vi.fn();
    await expect(
      // @ts-expect-error simulating a bad value reaching the service
      writeSettings({ defaultEngine: "claude" }, { persist }),
    ).rejects.toThrow(/Unknown engine/);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("testEngine", () => {
  it("returns not_configured without probing when the key is absent", async () => {
    const probe = vi.fn();
    const status = await testEngine("openai", {
      providers: providers(false, false),
      probe,
    });
    expect(status).toBe("not_configured");
    expect(probe).not.toHaveBeenCalled();
  });

  it("returns connected on a successful probe", async () => {
    const status = await testEngine("openai", {
      providers: providers(true, false),
      probe: async () => {},
    });
    expect(status).toBe("connected");
  });

  it("returns error when the probe fails", async () => {
    const status = await testEngine("openai", {
      providers: providers(true, false),
      probe: async () => {
        throw new Error("bad key");
      },
    });
    expect(status).toBe("error");
  });

  it("returns error when the probe times out", async () => {
    const status = await testEngine("gemini", {
      providers: providers(true, true),
      probe: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    expect(status).toBe("error");
  });
});
