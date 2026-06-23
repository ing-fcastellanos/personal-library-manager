import { describe, it, expect } from "vitest";
import {
  toIsbn13,
  splitBisacCategories,
  normalizeGoogleVolume,
  normalizeOpenLibrary,
} from "./normalize";

describe("toIsbn13", () => {
  it("passes through a 13-digit ISBN, stripping separators", () => {
    expect(toIsbn13("978-0-307-47472-8")).toBe("9780307474728");
  });

  it("converts a valid ISBN-10 to ISBN-13", () => {
    expect(toIsbn13("0307474720")).toBe("9780307474728");
  });

  it("returns null for unusable input", () => {
    expect(toIsbn13("12345")).toBeNull();
    expect(toIsbn13(undefined)).toBeNull();
    expect(toIsbn13(null)).toBeNull();
  });
});

describe("splitBisacCategories", () => {
  it("splits BISAC strings on '/' into display levels and slugs", () => {
    const out = splitBisacCategories(["Fiction / Science Fiction"]);
    expect(out.categories).toEqual(["Fiction", "Science Fiction"]);
    expect(out.categoryKeys).toEqual(["fiction", "science-fiction"]);
  });

  it("de-duplicates repeated levels across entries", () => {
    const out = splitBisacCategories([
      "Fiction / General",
      "Fiction / Science Fiction",
    ]);
    expect(out.categories).toEqual(["Fiction", "General", "Science Fiction"]);
  });

  it("handles missing categories", () => {
    expect(splitBisacCategories(undefined)).toEqual({
      categories: [],
      categoryKeys: [],
    });
  });
});

describe("normalizeGoogleVolume", () => {
  it("normalizes a volume with derived slugs, BISAC split and source", () => {
    const candidate = normalizeGoogleVolume({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      publishedDate: "1967-05-30",
      categories: ["Fiction / Literary"],
      industryIdentifiers: [
        { type: "ISBN_13", identifier: "978-0-307-47472-8" },
      ],
      imageLinks: { thumbnail: "http://books.example/cover.jpg" },
    });
    expect(candidate).not.toBeNull();
    expect(candidate!.titleKey).toBe("cien-anos-de-soledad");
    expect(candidate!.authorKeys).toEqual(["gabriel-garcia-marquez"]);
    expect(candidate!.categoryKeys).toEqual(["fiction", "literary"]);
    expect(candidate!.isbn13).toBe("9780307474728");
    expect(candidate!.publishedYear).toBe(1967);
    expect(candidate!.source).toBe("google-books");
  });

  it("returns null when the volume has no title", () => {
    expect(normalizeGoogleVolume({ authors: ["X"] })).toBeNull();
    expect(normalizeGoogleVolume(undefined)).toBeNull();
  });
});

describe("normalizeOpenLibrary", () => {
  it("normalizes authors, cover, and isbn without using subjects as categories", () => {
    const candidate = normalizeOpenLibrary({
      title: "Cien Años de Soledad",
      authors: [{ name: "Gabriel García Márquez" }],
      publish_date: "1967",
      cover: { large: "http://covers.example/L.jpg" },
      identifiers: { isbn_13: ["9780307474728"] },
    });
    expect(candidate).not.toBeNull();
    expect(candidate!.authorKeys).toEqual(["gabriel-garcia-marquez"]);
    expect(candidate!.coverUrl).toBe("http://covers.example/L.jpg");
    expect(candidate!.categories).toEqual([]);
    expect(candidate!.source).toBe("open-library");
  });
});
