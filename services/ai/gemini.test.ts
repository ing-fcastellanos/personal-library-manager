import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@google/genai";

/**
 * Retry behavior for the Gemini engine (#128 follow-up). With OpenAI unfunded
 * and fallback disabled by default, Gemini's own transient failures — `503`
 * under high demand, `429` on a per-minute quota burst — must be absorbed
 * in-place rather than surfacing straight to the reader. `GoogleGenAI` is
 * mocked so these run network-free; `ApiError` is the real class since the
 * retry logic keys off `instanceof`.
 */

const generateContentMock = vi.fn();

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return {
    ...actual,
    // A plain `function`, not an arrow: the real class is invoked with `new`,
    // and only a regular function can stand in as a constructor.
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return { models: { generateContent: generateContentMock } };
    }),
  };
});

const { createGeminiProvider } = await import("./gemini");

const image = { base64: "Zm9v", mimeType: "image/jpeg" };

function textResponse(book: unknown) {
  return { text: JSON.stringify({ book }) };
}

function transientError(status: 429 | 503) {
  return new ApiError({ message: `${status}`, status });
}

beforeEach(() => {
  generateContentMock.mockReset();
  process.env.GEMINI_API_KEY = "test-key";
});

describe("createGeminiProvider retry", () => {
  it("retries once on a 503 and succeeds on the next attempt", async () => {
    generateContentMock
      .mockRejectedValueOnce(transientError(503))
      .mockResolvedValueOnce(textResponse({ title: "Dune" }));
    const delayImpl = vi.fn().mockResolvedValue(undefined);
    const provider = createGeminiProvider({ delayImpl });

    const result = await provider.identifyBookFromImage(image);

    expect(result?.title).toBe("Dune");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(delayImpl).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it("retries a 429 the same as a 503", async () => {
    generateContentMock
      .mockRejectedValueOnce(transientError(429))
      .mockResolvedValueOnce(textResponse({ title: "Dune" }));
    const delayImpl = vi.fn().mockResolvedValue(undefined);
    const provider = createGeminiProvider({ delayImpl });

    const result = await provider.identifyBookFromImage(image);

    expect(result?.title).toBe("Dune");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries and throws the last error", async () => {
    generateContentMock
      .mockRejectedValueOnce(transientError(503))
      .mockRejectedValueOnce(transientError(503))
      .mockRejectedValueOnce(transientError(503));
    const delayImpl = vi.fn().mockResolvedValue(undefined);
    const provider = createGeminiProvider({ delayImpl });

    await expect(provider.identifyBookFromImage(image)).rejects.toThrow();

    expect(generateContentMock).toHaveBeenCalledTimes(3);
    expect(delayImpl).toHaveBeenNthCalledWith(1, 1000);
    expect(delayImpl).toHaveBeenNthCalledWith(2, 3000);
  });

  it("does not retry a non-transient ApiError status", async () => {
    generateContentMock.mockRejectedValueOnce(
      new ApiError({ message: "bad request", status: 400 }),
    );
    const delayImpl = vi.fn().mockResolvedValue(undefined);
    const provider = createGeminiProvider({ delayImpl });

    await expect(provider.identifyBookFromImage(image)).rejects.toThrow(
      "bad request",
    );
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(delayImpl).not.toHaveBeenCalled();
  });

  it("does not retry an error that isn't an ApiError", async () => {
    generateContentMock.mockRejectedValueOnce(new Error("network down"));
    const delayImpl = vi.fn().mockResolvedValue(undefined);
    const provider = createGeminiProvider({ delayImpl });

    await expect(provider.identifyBookFromImage(image)).rejects.toThrow(
      "network down",
    );
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(delayImpl).not.toHaveBeenCalled();
  });
});
