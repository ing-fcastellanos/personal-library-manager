import { describe, it, expect } from "vitest";
import { createBook } from "../books/repository";
import { createCopy } from "../copies/repository";
import { findBookDuplicates } from "./service";

/**
 * Emulator-backed tests for the duplicate-detection hook (#16). Seeds real books
 * and copies, then verifies matches, tiers, copy counts, and the recommendation.
 */
describe("findBookDuplicates (emulator)", () => {
  it("flags an exact ISBN match as add-copy with the copy count", async () => {
    const created = await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      isbn13: "9780307474728",
    });
    await createCopy({ bookId: created.id });

    const result = await findBookDuplicates({ isbn: "978-0-307-47472-8" });
    expect(result.recommendation).toBe("add-copy");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].tier).toBe("exact");
    expect(result.matches[0].book.id).toBe(created.id);
    expect(result.matches[0].existingCopies).toBe(1);
    expect(result.matches[0].suggestedAction).toBe("add-copy");
  });

  it("flags a strong match with a different ISBN as add-new-edition", async () => {
    await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      isbn13: "9780307474728",
    });

    const result = await findBookDuplicates({
      isbn: "9781234567897",
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
    });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].tier).toBe("strong");
    expect(result.recommendation).toBe("add-new-edition");
  });

  it("does not match a same-titled book by a different author", async () => {
    await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
    });

    const result = await findBookDuplicates({
      title: "Cien Años de Soledad",
      authors: ["Alguien Más"],
    });
    expect(result.matches).toHaveLength(0);
    expect(result.recommendation).toBe("add-new");
  });

  it("recommends add-new when nothing matches", async () => {
    const result = await findBookDuplicates({ isbn: "9780000000002" });
    expect(result.matches).toHaveLength(0);
    expect(result.recommendation).toBe("add-new");
  });
});
