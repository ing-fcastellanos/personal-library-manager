import { describe, it, expect } from "vitest";
import { normalizeCandidate, classifyMatch } from "./matcher";
import type { Book } from "../../lib/types/book";

function book(overrides: Partial<Book>): Book {
  return {
    id: "b1",
    title: "Cien Años de Soledad",
    subtitle: null,
    authors: ["Gabriel García Márquez"],
    authorKeys: ["gabriel-garcia-marquez"],
    publisher: null,
    publishedYear: null,
    isbn13: "9780307474728",
    isbn10: null,
    categories: [],
    categoryKeys: [],
    coverUrl: null,
    pageCount: null,
    language: null,
    description: null,
    workKey: null,
    titleKey: "cien-anos-de-soledad",
    source: null,
    createdAt: "2026-06-23T00:00:00.000Z",
    updatedAt: "2026-06-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeCandidate", () => {
  it("canonicalizes ISBN and derives slugs", () => {
    const norm = normalizeCandidate({
      isbn: "0-307-47472-0",
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
    });
    expect(norm.isbn13).toBe("9780307474728");
    expect(norm.titleKey).toBe("cien-anos-de-soledad");
    expect(norm.authorKeys).toEqual(["gabriel-garcia-marquez"]);
  });
});

describe("classifyMatch", () => {
  it("returns EXACT for an equal canonical ISBN", () => {
    const cls = classifyMatch(
      normalizeCandidate({ isbn: "978-0-307-47472-8", title: "Other" }),
      book({}),
    );
    expect(cls).toEqual({
      tier: "exact",
      score: 1,
      suggestedAction: "add-copy",
    });
  });

  it("returns STRONG with add-new-edition for same title/author, different ISBN", () => {
    const cls = classifyMatch(
      normalizeCandidate({
        isbn: "9781234567897",
        title: "Cien Años de Soledad",
        authors: ["Gabriel García Márquez"],
      }),
      book({}),
    );
    expect(cls?.tier).toBe("strong");
    expect(cls?.suggestedAction).toBe("add-new-edition");
  });

  it("returns STRONG with review when an ISBN is missing on one side", () => {
    const cls = classifyMatch(
      normalizeCandidate({
        title: "Cien Años de Soledad",
        authors: ["Gabriel García Márquez"],
      }),
      book({}),
    );
    expect(cls?.tier).toBe("strong");
    expect(cls?.suggestedAction).toBe("review");
  });

  it("does NOT match same title with disjoint authors", () => {
    const cls = classifyMatch(
      normalizeCandidate({
        title: "Cien Años de Soledad",
        authors: ["Otra Persona"],
      }),
      book({ isbn13: null }),
    );
    expect(cls).toBeNull();
  });

  it("STRONG (no authors on candidate) scores below an author-overlap match", () => {
    const noAuthors = classifyMatch(
      normalizeCandidate({ title: "Cien Años de Soledad" }),
      book({ isbn13: null }),
    );
    const withAuthors = classifyMatch(
      normalizeCandidate({
        title: "Cien Años de Soledad",
        authors: ["Gabriel García Márquez"],
      }),
      book({ isbn13: null }),
    );
    expect(noAuthors?.tier).toBe("strong");
    expect(noAuthors!.score).toBeLessThan(withAuthors!.score);
  });

  it("returns null when neither ISBN nor titleKey matches", () => {
    const cls = classifyMatch(
      normalizeCandidate({ isbn: "9781111111111", title: "Unrelated" }),
      book({}),
    );
    expect(cls).toBeNull();
  });
});
