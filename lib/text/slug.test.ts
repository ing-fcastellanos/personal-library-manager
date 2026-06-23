import { describe, it, expect } from "vitest";
import { slugify, arraySlugs } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates word runs", () => {
    expect(slugify("Cien Años de Soledad")).toBe("cien-anos-de-soledad");
  });

  it("strips diacritics", () => {
    expect(slugify("Gabriel García Márquez")).toBe("gabriel-garcia-marquez");
    expect(slugify("Émile Zoë")).toBe("emile-zoe");
  });

  it("collapses runs of punctuation/whitespace into a single hyphen", () => {
    expect(slugify("Hello,   World!!")).toBe("hello-world");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  ¡Hola! ")).toBe("hola");
    expect(slugify("--A. A.--")).toBe("a-a");
  });

  it("keeps digits", () => {
    expect(slugify("1984")).toBe("1984");
    expect(slugify("Catch 22")).toBe("catch-22");
  });

  it("returns an empty string when there is nothing slug-worthy", () => {
    expect(slugify("")).toBe("");
    expect(slugify("¡!¿?")).toBe("");
  });

  it("is deterministic / pure (same input, same output)", () => {
    const input = "Gabriel García Márquez";
    expect(slugify(input)).toBe(slugify(input));
  });
});

describe("arraySlugs", () => {
  it("slugifies each value", () => {
    expect(arraySlugs(["Émile Zola", "Cien Años"])).toEqual([
      "emile-zola",
      "cien-anos",
    ]);
  });

  it("drops empty results and de-duplicates while preserving order", () => {
    expect(arraySlugs(["A. A.", "", "A. A.", "¡!", "B"])).toEqual(["a-a", "b"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(arraySlugs([])).toEqual([]);
  });
});
