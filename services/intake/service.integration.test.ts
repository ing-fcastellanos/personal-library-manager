import { describe, it, expect, vi } from "vitest";
import { intakeBook } from "./service";
import { getBook } from "../books/repository";
import { listCopiesByBook } from "../copies/repository";
import { createShelf } from "../shelves/repository";

/**
 * Emulator-backed tests for the manual intake service (#14). Seeds via the real
 * repositories; the cover re-host is injected so the best-effort path is exercised
 * without network/Storage.
 */
describe("intakeBook (emulator)", () => {
  it("creates a book and a copy", async () => {
    const { book, copy } = await intakeBook(
      {
        book: { title: "Cien Años de Soledad", isbn13: "9780307474728" },
        copy: { condition: "good" },
      },
      { rehost: vi.fn().mockResolvedValue(null) },
    );
    expect(book.id).toBeTruthy();
    expect(copy.bookId).toBe(book.id);
    const copies = await listCopiesByBook(book.id);
    expect(copies).toHaveLength(1);
    expect(copies[0].condition).toBe("good");
  });

  it("sets coverUrl to the re-hosted internal URL on success", async () => {
    const rehost = vi.fn().mockResolvedValue("https://storage/covers/x.jpg");
    const { book } = await intakeBook(
      {
        book: { title: "With Cover", isbn13: "9780307474728" },
        coverSourceUrl: "https://example.com/cover.jpg",
      },
      { rehost },
    );
    expect(rehost).toHaveBeenCalledOnce();
    expect(book.coverUrl).toBe("https://storage/covers/x.jpg");
    expect((await getBook(book.id))?.coverUrl).toBe(
      "https://storage/covers/x.jpg",
    );
  });

  it("still creates the book when re-hosting fails (best-effort)", async () => {
    const { book, copy } = await intakeBook(
      {
        book: { title: "Cover Down", isbn13: "9780307474728" },
        coverSourceUrl: "https://example.com/cover.jpg",
      },
      { rehost: vi.fn().mockResolvedValue(null) },
    );
    expect(book.id).toBeTruthy();
    expect(copy.bookId).toBe(book.id);
    // Falls back to the external source URL.
    expect(book.coverUrl).toBe("https://example.com/cover.jpg");
  });

  it("associates the copy with an existing shelf", async () => {
    const shelf = await createShelf({ name: "Estante A" });
    const { copy } = await intakeBook({
      book: { title: "Shelved Book" },
      copy: { shelfId: shelf.id },
    });
    expect(copy.shelfId).toBe(shelf.id);
  });

  it("rejects an intake whose copy references a missing shelf", async () => {
    await expect(
      intakeBook({
        book: { title: "Bad Shelf" },
        copy: { shelfId: "does-not-exist" },
      }),
    ).rejects.toThrow();
  });
});
