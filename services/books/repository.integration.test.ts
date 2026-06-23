import { describe, it, expect } from "vitest";
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from "./repository";

/**
 * Emulator-backed CRUD + derived-slug tests for the books repository (#12).
 */
describe("books repository (emulator)", () => {
  it("creates a book and derives slug fields on create", async () => {
    const book = await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      categories: ["Realismo Mágico"],
    });
    expect(book.id).toBeTruthy();
    expect(book.titleKey).toBe("cien-anos-de-soledad");
    expect(book.authorKeys).toEqual(["gabriel-garcia-marquez"]);
    expect(book.categoryKeys).toEqual(["realismo-magico"]);
    expect(book.createdAt).toBe(book.updatedAt);
  });

  it("defaults array fields and nullable fields", async () => {
    const book = await createBook({ title: "Untitled" });
    expect(book.authors).toEqual([]);
    expect(book.authorKeys).toEqual([]);
    expect(book.categories).toEqual([]);
    expect(book.isbn13).toBeNull();
  });

  it("recomputes slugs when title/authors change on update", async () => {
    const created = await createBook({
      title: "Old Title",
      authors: ["Jane Doe"],
    });
    const updated = await updateBook(created.id, {
      title: "New Title",
      authors: ["John Roe"],
    });
    expect(updated?.titleKey).toBe("new-title");
    expect(updated?.authorKeys).toEqual(["john-roe"]);
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
  });

  it("leaves slugs untouched when their source field is not in the update", async () => {
    const created = await createBook({ title: "Stable", authors: ["A B"] });
    const updated = await updateBook(created.id, { publisher: "Acme" });
    expect(updated?.titleKey).toBe("stable");
    expect(updated?.authorKeys).toEqual(["a-b"]);
    expect(updated?.publisher).toBe("Acme");
  });

  it("gets by id, lists ordered by titleKey, and deletes", async () => {
    await createBook({ title: "Zeta" });
    await createBook({ title: "Alpha" });
    const titles = (await listBooks()).map((b) => b.title);
    expect(titles).toEqual(["Alpha", "Zeta"]);

    const created = await createBook({ title: "Temp" });
    expect(await getBook(created.id)).toMatchObject({ id: created.id });
    expect(await deleteBook(created.id)).toBe(true);
    expect(await getBook(created.id)).toBeNull();
    expect(await deleteBook(created.id)).toBe(false);
  });
});
