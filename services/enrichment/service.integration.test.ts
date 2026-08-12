import { describe, it, expect, vi } from "vitest";
import { enrichByIsbn, searchByText } from "./service";
import { GoogleBooksRateLimitError } from "./google-books";
import type { Candidate } from "./types";

/**
 * Emulator-backed tests that the enrichment cache short-circuits external sources
 * on a repeated lookup (#13, design D5). Sources are injected so the test counts
 * how many times they are called without touching the network.
 */

const ISBN = "9780307474728";

function candidate(title: string): Candidate {
  return {
    title,
    subtitle: null,
    authors: ["Gabriel García Márquez"],
    authorKeys: ["gabriel-garcia-marquez"],
    publisher: null,
    publishedYear: 1967,
    isbn13: ISBN,
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: null,
    coverWidth: null,
    pageCount: null,
    language: null,
    description: null,
    titleKey: title.toLowerCase().replace(/\s+/g, "-"),
    source: "google-books",
  };
}

describe("enrichment service caching (emulator)", () => {
  it("serves the second ISBN lookup from cache without calling sources", async () => {
    const googleByIsbn = vi.fn().mockResolvedValue(candidate("Cien Anos"));
    const openByIsbn = vi.fn().mockResolvedValue(null);

    const first = await enrichByIsbn(ISBN, { googleByIsbn, openByIsbn });
    const second = await enrichByIsbn(ISBN, { googleByIsbn, openByIsbn });

    expect(first?.title).toBe("Cien Anos");
    expect(second?.title).toBe("Cien Anos");
    expect(googleByIsbn).toHaveBeenCalledTimes(1);
    expect(openByIsbn).toHaveBeenCalledTimes(1);
  });

  it("serves the second text search from cache without re-querying", async () => {
    const googleSearch = vi
      .fn()
      .mockResolvedValue([candidate("Cien Anos de Soledad")]);

    await searchByText("cien anos marquez", { googleSearch });
    const second = await searchByText("cien anos marquez", { googleSearch });

    expect(second).toHaveLength(1);
    expect(googleSearch).toHaveBeenCalledTimes(1);
  });

  it("falls back to Open Library search when Google Books is empty", async () => {
    const googleSearch = vi.fn().mockResolvedValue([]);
    const openSearch = vi
      .fn()
      .mockResolvedValue([candidate("El Color de las Cosas Invisibles")]);

    const result = await searchByText("color cosas invisibles longarela", {
      googleSearch,
      openSearch,
    });

    expect(googleSearch).toHaveBeenCalledTimes(1);
    expect(openSearch).toHaveBeenCalledTimes(1);
    expect(result[0]?.title).toBe("El Color de las Cosas Invisibles");
  });

  it("degrades gracefully when one ISBN source throws", async () => {
    const googleByIsbn = vi.fn().mockRejectedValue(new Error("GB down"));
    const openByIsbn = vi.fn().mockResolvedValue(candidate("From OL"));

    const result = await enrichByIsbn(ISBN, { googleByIsbn, openByIsbn });
    expect(result?.title).toBe("From OL");
  });
});

describe("enrichment service rate-limit retry (emulator)", () => {
  it("retries an ISBN lookup that hits the rate limit, then succeeds", async () => {
    const isbn = "9780143127550";
    const googleByIsbn = vi
      .fn()
      .mockRejectedValueOnce(new GoogleBooksRateLimitError())
      .mockResolvedValueOnce(candidate("Retried OK"));
    const openByIsbn = vi.fn().mockResolvedValue(null);
    const delayImpl = vi.fn().mockResolvedValue(undefined);

    const result = await enrichByIsbn(isbn, {
      googleByIsbn,
      openByIsbn,
      delayImpl,
    });

    expect(result?.title).toBe("Retried OK");
    expect(googleByIsbn).toHaveBeenCalledTimes(2);
    expect(delayImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries on a sustained rate limit", async () => {
    const isbn = "9781400079988";
    const googleByIsbn = vi
      .fn()
      .mockRejectedValue(new GoogleBooksRateLimitError());
    const openByIsbn = vi.fn().mockResolvedValue(candidate("From OL fallback"));
    const delayImpl = vi.fn().mockResolvedValue(undefined);

    const result = await enrichByIsbn(isbn, {
      googleByIsbn,
      openByIsbn,
      delayImpl,
    });

    expect(result?.title).toBe("From OL fallback");
    expect(googleByIsbn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
    expect(delayImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-rate-limit failure", async () => {
    const isbn = "9780061120084";
    const googleByIsbn = vi.fn().mockRejectedValue(new Error("boom"));
    const openByIsbn = vi.fn().mockResolvedValue(candidate("From OL only"));
    const delayImpl = vi.fn().mockResolvedValue(undefined);

    const result = await enrichByIsbn(isbn, {
      googleByIsbn,
      openByIsbn,
      delayImpl,
    });

    expect(result?.title).toBe("From OL only");
    expect(googleByIsbn).toHaveBeenCalledTimes(1);
    expect(delayImpl).not.toHaveBeenCalled();
  });

  it("retries a text search that hits the rate limit, then succeeds", async () => {
    const googleSearch = vi
      .fn()
      .mockRejectedValueOnce(new GoogleBooksRateLimitError())
      .mockResolvedValueOnce([candidate("Retried Search")]);
    const delayImpl = vi.fn().mockResolvedValue(undefined);

    const result = await searchByText("unique rate limit retry query", {
      googleSearch,
      delayImpl,
    });

    expect(result[0]?.title).toBe("Retried Search");
    expect(googleSearch).toHaveBeenCalledTimes(2);
    expect(delayImpl).toHaveBeenCalledTimes(1);
  });
});
