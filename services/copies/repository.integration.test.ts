import { describe, it, expect } from "vitest";
import {
  listCopies,
  getCopy,
  updateCopy,
  deleteCopy,
  listCopiesByBook,
  bookHasCopies,
  unshelveByShelf,
} from "./repository";
import { createCopy, ReferenceNotFoundError } from "./service";
import { createBook } from "../books/repository";
import { createShelf } from "../shelves/repository";

/**
 * Emulator-backed tests for the copies repository + service (#12): CRUD,
 * referential validation, the book→copies relationship read, and shelf-delete
 * desasociation.
 */
describe("copies repository + service (emulator)", () => {
  it("creates a copy referencing an existing book (and optional shelf)", async () => {
    const book = await createBook({ title: "Dune" });
    const shelf = await createShelf({ name: "Sci-Fi" });
    const copy = await createCopy({ bookId: book.id, shelfId: shelf.id });
    expect(copy.id).toBeTruthy();
    expect(copy.bookId).toBe(book.id);
    expect(copy.shelfId).toBe(shelf.id);
  });

  it("allows a copy with no shelf (unshelved is valid)", async () => {
    const book = await createBook({ title: "Solaris" });
    const copy = await createCopy({ bookId: book.id });
    expect(copy.shelfId).toBeNull();
  });

  it("rejects a copy whose book does not exist, writing nothing", async () => {
    await expect(createCopy({ bookId: "missing-book" })).rejects.toBeInstanceOf(
      ReferenceNotFoundError,
    );
    expect(await listCopies()).toHaveLength(0);
  });

  it("rejects a copy whose shelf does not exist", async () => {
    const book = await createBook({ title: "Hyperion" });
    await expect(
      createCopy({ bookId: book.id, shelfId: "missing-shelf" }),
    ).rejects.toMatchObject({ field: "shelfId" });
  });

  it("lists copies of a book and reports bookHasCopies", async () => {
    const book = await createBook({ title: "Foundation" });
    const other = await createBook({ title: "Other" });
    await createCopy({ bookId: book.id });
    await createCopy({ bookId: book.id });
    expect(await listCopiesByBook(book.id)).toHaveLength(2);
    expect(await listCopiesByBook(other.id)).toHaveLength(0);
    expect(await bookHasCopies(book.id)).toBe(true);
    expect(await bookHasCopies(other.id)).toBe(false);
  });

  it("updates and deletes a copy", async () => {
    const book = await createBook({ title: "Neuromancer" });
    const copy = await createCopy({ bookId: book.id, condition: "good" });
    const updated = await updateCopy(copy.id, { condition: "worn" });
    expect(updated?.condition).toBe("worn");
    expect(await deleteCopy(copy.id)).toBe(true);
    expect(await getCopy(copy.id)).toBeNull();
  });

  it("unshelves copies of a shelf (desasociation), leaving the copies intact", async () => {
    const book = await createBook({ title: "Snow Crash" });
    const shelf = await createShelf({ name: "Cyberpunk" });
    const a = await createCopy({ bookId: book.id, shelfId: shelf.id });
    const b = await createCopy({ bookId: book.id, shelfId: shelf.id });

    const count = await unshelveByShelf(shelf.id);
    expect(count).toBe(2);
    expect((await getCopy(a.id))?.shelfId).toBeNull();
    expect((await getCopy(b.id))?.shelfId).toBeNull();
  });
});
