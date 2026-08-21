import { describe, it, expect, vi } from "vitest";
import { searchCoverByPublisher } from "./service";
import type { Candidate } from "./types";

/**
 * Unit tests for `searchCoverByPublisher` (#22). Unlike `enrichByIsbn`/
 * `searchByText`, this path isn't cached, so it needs no Firestore emulator —
 * network access is stubbed via an injected `googleSearchByPublisher`.
 */

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    title: "Rayuela",
    subtitle: null,
    authors: ["Julio Cortázar"],
    authorKeys: ["julio-cortazar"],
    publisher: "Debolsillo",
    publishedYear: 2019,
    isbn13: null,
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: "https://covers.example/rayuela.jpg",
    coverWidth: null,
    pageCount: null,
    language: "es",
    description: null,
    titleKey: "rayuela",
    source: "google-books",
    ...over,
  };
}

describe("searchCoverByPublisher", () => {
  it("ranks and caps results at 5", async () => {
    const found = Array.from({ length: 8 }, (_, i) =>
      candidate({ isbn13: `978000000000${i}` }),
    );
    const googleSearchByPublisher = vi.fn(async () => found);
    const out = await searchCoverByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { googleSearchByPublisher },
    );
    expect(out).toHaveLength(5);
  });

  it("returns an empty list, not a throw, when nothing matches", async () => {
    const googleSearchByPublisher = vi.fn(async () => []);
    const out = await searchCoverByPublisher(
      "Un libro rarísimo",
      [],
      "Editorial inexistente",
      { googleSearchByPublisher },
    );
    expect(out).toEqual([]);
  });

  it("discards candidates without a coverUrl", async () => {
    const googleSearchByPublisher = vi.fn(async () => [
      candidate({ coverUrl: null, isbn13: "9780000000001" }),
      candidate({
        coverUrl: "https://covers.example/a.jpg",
        isbn13: "9780000000002",
      }),
    ]);
    const out = await searchCoverByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { googleSearchByPublisher },
    );
    expect(out).toHaveLength(1);
    expect(out[0].coverUrl).toBe("https://covers.example/a.jpg");
  });

  it("builds a year · publisher caption, dropping missing segments", async () => {
    const googleSearchByPublisher = vi.fn(async () => [
      candidate({
        publishedYear: 2019,
        publisher: "Debolsillo",
        isbn13: "9780000000003",
      }),
      candidate({
        publishedYear: null,
        publisher: "Debolsillo",
        isbn13: "9780000000004",
      }),
      candidate({
        publishedYear: 2019,
        publisher: null,
        isbn13: "9780000000005",
      }),
      candidate({
        publishedYear: null,
        publisher: null,
        isbn13: "9780000000006",
      }),
    ]);
    const out = await searchCoverByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { googleSearchByPublisher },
    );
    const byIsbn = Object.fromEntries(out.map((c) => [c.id, c.caption]));
    expect(byIsbn["9780000000003"]).toBe("2019 · Debolsillo");
    expect(byIsbn["9780000000004"]).toBe("Debolsillo");
    expect(byIsbn["9780000000005"]).toBe("2019");
    expect(byIsbn["9780000000006"]).toBe("");
  });

  it("degrades to an empty list when the source throws a non-rate-limit error", async () => {
    const googleSearchByPublisher = vi.fn(async () => {
      throw new Error("boom");
    });
    const out = await searchCoverByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { googleSearchByPublisher },
    );
    expect(out).toEqual([]);
  });
});
