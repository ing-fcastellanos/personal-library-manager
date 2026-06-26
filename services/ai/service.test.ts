import { describe, it, expect, vi } from "vitest";
import { identifyBookFromImage, identifyBooksFromImage } from "./service";
import { toAICandidate } from "./normalize";
import {
  NoEngineAvailableError,
  type AICandidate,
  type AIEngine,
  type AIImage,
  type AIProvider,
} from "./types";

const IMG: AIImage = { base64: "AAAA", mimeType: "image/jpeg" };

function candidateFrom(engine: AIEngine): AICandidate {
  return toAICandidate({ title: "Dune" }, engine);
}

interface FakeOpts {
  configured?: boolean;
  book?: AIProvider["identifyBookFromImage"];
  books?: AIProvider["identifyBooksFromImage"];
}

function fakeProvider(id: AIEngine, opts: FakeOpts = {}): AIProvider {
  return {
    id,
    isConfigured: () => opts.configured ?? true,
    identifyBookFromImage: opts.book ?? (async () => candidateFrom(id)),
    identifyBooksFromImage: opts.books ?? (async () => [candidateFrom(id)]),
  };
}

const config =
  (defaultEngine: AIEngine, fallbackEnabled: boolean) => async () => ({
    defaultEngine,
    fallbackEnabled,
  });

describe("AI orchestrator — engine selection", () => {
  it("uses the configured default engine and records who answered", async () => {
    const result = await identifyBookFromImage(IMG, {
      config: config("openai", true),
      providers: {
        openai: fakeProvider("openai"),
        gemini: fakeProvider("gemini"),
      },
    });
    expect(result?.sourceProvider).toBe("openai");
  });

  it("attempts the configured default first (gemini)", async () => {
    const result = await identifyBookFromImage(IMG, {
      config: config("gemini", true),
      providers: {
        openai: fakeProvider("openai"),
        gemini: fakeProvider("gemini"),
      },
    });
    expect(result?.sourceProvider).toBe("gemini");
  });
});

describe("AI orchestrator — fallback", () => {
  it("falls back to the secondary when the default throws", async () => {
    const openai = fakeProvider("openai", {
      book: vi.fn(async () => {
        throw new Error("openai down");
      }),
    });
    const gemini = fakeProvider("gemini");
    const result = await identifyBookFromImage(IMG, {
      config: config("openai", true),
      providers: { openai, gemini },
    });
    expect(result?.sourceProvider).toBe("gemini");
    expect(openai.identifyBookFromImage).toHaveBeenCalledOnce();
  });

  it("skips an unconfigured default and uses the secondary", async () => {
    const result = await identifyBooksFromImage(IMG, {
      config: config("openai", true),
      providers: {
        openai: fakeProvider("openai", { configured: false }),
        gemini: fakeProvider("gemini"),
      },
    });
    expect(result[0]?.sourceProvider).toBe("gemini");
  });

  it("falls back when the default times out", async () => {
    const openai = fakeProvider("openai", {
      book: () => new Promise<AICandidate>(() => {}), // never resolves
    });
    const result = await identifyBookFromImage(IMG, {
      config: config("openai", true),
      providers: { openai, gemini: fakeProvider("gemini") },
      timeoutMs: 20,
    });
    expect(result?.sourceProvider).toBe("gemini");
  });

  it("does NOT call the secondary when fallback is disabled", async () => {
    const gemini = fakeProvider("gemini", { book: vi.fn() });
    const openai = fakeProvider("openai", {
      book: async () => {
        throw new Error("openai down");
      },
    });
    await expect(
      identifyBookFromImage(IMG, {
        config: config("openai", false),
        providers: { openai, gemini },
      }),
    ).rejects.toThrow("openai down");
    expect(gemini.identifyBookFromImage).not.toHaveBeenCalled();
  });

  it("treats a null result as success, not a fallback trigger", async () => {
    const gemini = fakeProvider("gemini", { book: vi.fn() });
    const result = await identifyBookFromImage(IMG, {
      config: config("openai", true),
      providers: {
        openai: fakeProvider("openai", { book: async () => null }),
        gemini,
      },
    });
    expect(result).toBeNull();
    expect(gemini.identifyBookFromImage).not.toHaveBeenCalled();
  });
});

describe("AI orchestrator — no engine available", () => {
  it("throws NoEngineAvailableError when neither engine is configured", async () => {
    await expect(
      identifyBookFromImage(IMG, {
        config: config("openai", true),
        providers: {
          openai: fakeProvider("openai", { configured: false }),
          gemini: fakeProvider("gemini", { configured: false }),
        },
      }),
    ).rejects.toBeInstanceOf(NoEngineAvailableError);
  });

  it("rethrows the last error when all configured engines fail", async () => {
    await expect(
      identifyBookFromImage(IMG, {
        config: config("openai", true),
        providers: {
          openai: fakeProvider("openai", {
            book: async () => {
              throw new Error("openai down");
            },
          }),
          gemini: fakeProvider("gemini", {
            book: async () => {
              throw new Error("gemini down");
            },
          }),
        },
      }),
    ).rejects.toThrow("gemini down");
  });
});
