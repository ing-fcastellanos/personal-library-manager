import { describe, it, expect } from "vitest";
import {
  readCache,
  writeCache,
  isbnKey,
  queryKey,
  ISBN_HIT_TTL_MS,
} from "./cache";
import type { Candidate } from "./types";

/**
 * Emulator-backed tests for the enrichment cache repository (#13, design D5).
 */

function candidate(title: string): Candidate {
  return {
    title,
    subtitle: null,
    authors: ["A"],
    authorKeys: ["a"],
    publisher: null,
    publishedYear: null,
    isbn13: "9780307474728",
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: null,
    coverWidth: null,
    pageCount: null,
    language: null,
    description: null,
    titleKey: title.toLowerCase(),
    source: "google-books",
  };
}

describe("enrichmentCache repository (emulator)", () => {
  it("round-trips a cached hit by ISBN key", async () => {
    const key = isbnKey("9780307474728");
    await writeCache(key, [candidate("Cached")], ISBN_HIT_TTL_MS);
    const out = await readCache(key);
    expect(out).not.toBeNull();
    expect(out![0].title).toBe("Cached");
  });

  it("returns an empty array for a cached negative result", async () => {
    const key = queryKey("nothing here");
    await writeCache(key, [], ISBN_HIT_TTL_MS);
    expect(await readCache(key)).toEqual([]);
  });

  it("returns null when there is no entry", async () => {
    expect(await readCache(isbnKey("0000000000000"))).toBeNull();
  });

  it("treats an expired entry as a miss (null)", async () => {
    const key = isbnKey("9780307474728");
    await writeCache(key, [candidate("Stale")], -1000); // already expired
    expect(await readCache(key)).toBeNull();
  });
});
