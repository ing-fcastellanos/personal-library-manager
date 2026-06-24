import { describe, it, expect } from "vitest";
import { createBook } from "../books/repository";
import { createCopy } from "../copies/repository";
import { createShelf } from "../shelves/repository";
import { createReadingEvent } from "../reading-events/repository";
import { searchCatalog } from "./service";

/**
 * Emulator-backed test for catalog search (#17): seeds real books/copies/shelves/
 * events and verifies a combined filter, reader-scoped status, and facets.
 */
describe("searchCatalog (emulator)", () => {
  it("combines query, shelf, and reader-status filters and returns facets", async () => {
    const shelf = await createShelf({ name: "Estante A" });
    const gabo = await createBook({
      title: "Cien Años de Soledad",
      authors: ["Gabriel García Márquez"],
      categories: ["Realismo Mágico"],
      isbn13: "9780307474728",
    });
    await createBook({ title: "Otro Libro", authors: ["Otra Persona"] });
    await createCopy({ bookId: gabo.id, shelfId: shelf.id });
    await createReadingEvent({
      readerId: "r1",
      bookId: gabo.id,
      copyId: null,
      status: "reading",
      dateStarted: null,
      dateFinished: null,
      rating: null,
      review: null,
      bookTitle: gabo.title,
      bookAuthors: gabo.authors,
      isbn13: gabo.isbn13 ?? null,
      coverUrl: null,
    });

    const byQuery = await searchCatalog({ q: "garcia marquez" });
    expect(byQuery.items.map((b) => b.id)).toEqual([gabo.id]);

    const combined = await searchCatalog({
      shelf: shelf.id,
      status: "reading",
      reader: "r1",
    });
    expect(combined.items.map((b) => b.id)).toEqual([gabo.id]);

    const all = await searchCatalog({});
    expect(all.total).toBe(2);
    expect(all.facets.shelves.find((f) => f.value === shelf.id)?.label).toBe(
      "Estante A",
    );
  });
});
