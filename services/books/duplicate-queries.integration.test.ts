import { describe, it, expect } from "vitest";
import {
  createBook,
  findBooksByIsbn13,
  findBooksByTitleKey,
  findBooksByAuthorKey,
} from "./repository";

/**
 * Emulator-backed tests for the duplicate-detection lookup queries on the books
 * repository (#16, design D2).
 */
describe("books duplicate-detection queries (emulator)", () => {
  it("finds a book by exact ISBN-13 and returns none for a miss", async () => {
    await createBook({ title: "Cien Años", isbn13: "9780307474728" });
    expect(await findBooksByIsbn13("9780307474728")).toHaveLength(1);
    expect(await findBooksByIsbn13("0000000000000")).toHaveLength(0);
  });

  it("finds a book by titleKey", async () => {
    await createBook({ title: "Cien Años de Soledad" });
    const found = await findBooksByTitleKey("cien-anos-de-soledad");
    expect(found).toHaveLength(1);
    expect(found[0].titleKey).toBe("cien-anos-de-soledad");
  });

  it("finds a book by author key via array-contains", async () => {
    await createBook({
      title: "El Otoño del Patriarca",
      authors: ["Gabriel García Márquez"],
    });
    const found = await findBooksByAuthorKey("gabriel-garcia-marquez");
    expect(found.map((b) => b.title)).toContain("El Otoño del Patriarca");
  });
});
