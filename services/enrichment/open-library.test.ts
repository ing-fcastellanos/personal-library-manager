import { describe, it, expect, vi } from "vitest";
import { openLibrarySearch } from "./open-library";
import { normalizeOpenLibrarySearchDoc } from "./normalize";

/** A fake `fetch` returning the given JSON body with a 200. */
function fakeFetch(body: unknown) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("normalizeOpenLibrarySearchDoc", () => {
  it("maps a search doc to a candidate with an Open Library cover", () => {
    const c = normalizeOpenLibrarySearchDoc({
      title: "Dune",
      author_name: ["Frank Herbert"],
      first_publish_year: 1965,
      isbn: ["0441172717"],
      cover_i: 12345,
      publisher: ["Ace"],
      number_of_pages_median: 412,
      language: ["eng"],
    });
    expect(c?.title).toBe("Dune");
    expect(c?.authors).toEqual(["Frank Herbert"]);
    expect(c?.publishedYear).toBe(1965);
    expect(c?.isbn13).toBe("9780441172719"); // isbn-10 canonicalized
    expect(c?.coverUrl).toBe("https://covers.openlibrary.org/b/id/12345-M.jpg");
    expect(c?.source).toBe("open-library");
  });

  it("returns null without a title", () => {
    expect(normalizeOpenLibrarySearchDoc({ author_name: ["x"] })).toBeNull();
  });

  it("has no cover when cover_i is absent", () => {
    expect(normalizeOpenLibrarySearchDoc({ title: "x" })?.coverUrl).toBeNull();
  });
});

describe("openLibrarySearch", () => {
  it("returns normalized candidates from search.json docs", async () => {
    const fetchImpl = fakeFetch({
      docs: [
        {
          title: "Dune",
          author_name: ["Frank Herbert"],
          first_publish_year: 1965,
        },
        { title: "Dune Messiah", author_name: ["Frank Herbert"] },
      ],
    });
    const out = await openLibrarySearch("dune herbert", { fetchImpl });
    expect(out.map((c) => c.title)).toEqual(["Dune", "Dune Messiah"]);
    expect(out[0].source).toBe("open-library");
  });

  it("drops untitled docs", async () => {
    const fetchImpl = fakeFetch({
      docs: [{ author_name: ["x"] }, { title: "Keep" }],
    });
    const out = await openLibrarySearch("q", { fetchImpl });
    expect(out.map((c) => c.title)).toEqual(["Keep"]);
  });

  it("returns [] when there are no docs", async () => {
    const fetchImpl = fakeFetch({});
    expect(await openLibrarySearch("q", { fetchImpl })).toEqual([]);
  });
});
