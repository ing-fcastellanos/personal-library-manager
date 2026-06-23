import { describe, it, expect } from "vitest";
import {
  listEventsByBook,
  listEventsByReader,
  bookHasEvents,
  readerHasEvents,
  deleteReadingEvent,
} from "./repository";
import { createReadingEvent, ReferenceNotFoundError } from "./service";
import { createBook } from "../books/repository";
import { createCopy } from "../copies/repository";
import { createReader } from "../readers/repository";

/**
 * Emulator-backed tests for the reading-events service + repository (#12):
 * snapshot composition, reference validation, relationship reads, and the
 * delete-integrity guards.
 */
describe("reading-events service (emulator)", () => {
  async function seedReaderAndBook() {
    const reader = await createReader({ name: "Frank" });
    const book = await createBook({
      title: "The Left Hand of Darkness",
      authors: ["Ursula K. Le Guin"],
      isbn13: "9780441478125",
      coverUrl: "https://example.test/cover.jpg",
    });
    return { reader, book };
  }

  it("composes the book snapshot from the referenced book on create", async () => {
    const { reader, book } = await seedReaderAndBook();
    const event = await createReadingEvent({
      readerId: reader.id,
      bookId: book.id,
      status: "finished",
    });
    expect(event.bookTitle).toBe("The Left Hand of Darkness");
    expect(event.bookAuthors).toEqual(["Ursula K. Le Guin"]);
    expect(event.isbn13).toBe("9780441478125");
    expect(event.coverUrl).toBe("https://example.test/cover.jpg");
    expect(event.readerId).toBe(reader.id);
  });

  it("accepts an optional copyId that exists", async () => {
    const { reader, book } = await seedReaderAndBook();
    const copy = await createCopy({ bookId: book.id });
    const event = await createReadingEvent({
      readerId: reader.id,
      bookId: book.id,
      copyId: copy.id,
      status: "reading",
    });
    expect(event.copyId).toBe(copy.id);
  });

  it("rejects events with a missing reader, book, or copy", async () => {
    const { reader, book } = await seedReaderAndBook();
    await expect(
      createReadingEvent({
        readerId: "nope",
        bookId: book.id,
        status: "finished",
      }),
    ).rejects.toMatchObject({ field: "readerId" });
    await expect(
      createReadingEvent({
        readerId: reader.id,
        bookId: "nope",
        status: "finished",
      }),
    ).rejects.toBeInstanceOf(ReferenceNotFoundError);
    await expect(
      createReadingEvent({
        readerId: reader.id,
        bookId: book.id,
        copyId: "nope",
        status: "finished",
      }),
    ).rejects.toMatchObject({ field: "copyId" });
  });

  it("serves relationship reads and integrity guards", async () => {
    const { reader, book } = await seedReaderAndBook();
    const event = await createReadingEvent({
      readerId: reader.id,
      bookId: book.id,
      status: "finished",
    });

    expect(await listEventsByBook(book.id)).toHaveLength(1);
    expect(await listEventsByReader(reader.id)).toHaveLength(1);
    expect(await bookHasEvents(book.id)).toBe(true);
    expect(await readerHasEvents(reader.id)).toBe(true);

    await deleteReadingEvent(event.id);
    expect(await bookHasEvents(book.id)).toBe(false);
    expect(await readerHasEvents(reader.id)).toBe(false);
  });
});
