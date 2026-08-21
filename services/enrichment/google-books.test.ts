import { describe, it, expect, vi } from "vitest";
import {
  googleBooksSearch,
  googleBooksByIsbn,
  googleBooksSearchByPublisher,
  fieldRestrictedQuery,
  GoogleBooksRateLimitError,
} from "./google-books";

/** A fake `fetch` responding with the given status and JSON body. */
function fakeFetch(status: number, body: unknown = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

/** A fake `fetch` that also records the URL(s) it was called with. */
function fakeFetchCapturing(status: number, body: unknown = {}) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (url: string) => {
    calls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("googleBooksSearch", () => {
  it("throws GoogleBooksRateLimitError on a 429 response", async () => {
    const fetchImpl = fakeFetch(429);
    await expect(
      googleBooksSearch("dune herbert", { fetchImpl }),
    ).rejects.toBeInstanceOf(GoogleBooksRateLimitError);
  });

  it("throws a generic error on other non-ok statuses", async () => {
    const fetchImpl = fakeFetch(500);
    await expect(
      googleBooksSearch("dune herbert", { fetchImpl }),
    ).rejects.toThrow("Google Books responded 500");
  });

  it("returns normalized candidates on success", async () => {
    const fetchImpl = fakeFetch(200, {
      items: [{ volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } }],
    });
    const out = await googleBooksSearch("dune herbert", { fetchImpl });
    expect(out.map((c) => c.title)).toEqual(["Dune"]);
  });
});

describe("googleBooksByIsbn", () => {
  it("throws GoogleBooksRateLimitError on a 429 response", async () => {
    const fetchImpl = fakeFetch(429);
    await expect(
      googleBooksByIsbn("9780307474728", { fetchImpl }),
    ).rejects.toBeInstanceOf(GoogleBooksRateLimitError);
  });
});

describe("fieldRestrictedQuery", () => {
  it("restricts title, author, and publisher independently", () => {
    expect(
      fieldRestrictedQuery({
        title: "Rayuela",
        author: "Julio Cortázar",
        publisher: "Debolsillo",
      }),
    ).toBe(
      'intitle:"Rayuela" inauthor:"Julio Cortázar" inpublisher:"Debolsillo"',
    );
  });

  it("omits parts that aren't provided", () => {
    expect(fieldRestrictedQuery({ title: "Rayuela" })).toBe(
      'intitle:"Rayuela"',
    );
  });

  it("strips embedded quotes so a value can't break out of the query", () => {
    expect(fieldRestrictedQuery({ publisher: 'Editorial "Rara"' })).toBe(
      'inpublisher:"Editorial Rara"',
    );
  });
});

describe("googleBooksSearchByPublisher", () => {
  it("sends a field-restricted query scoped to title, author, and publisher", async () => {
    const { fetchImpl, calls } = fakeFetchCapturing(200, { items: [] });
    await googleBooksSearchByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { fetchImpl },
    );
    expect(calls[0]).toContain(
      encodeURIComponent(
        'intitle:"Rayuela" inauthor:"Julio Cortázar" inpublisher:"Debolsillo"',
      ),
    );
  });

  it("returns every normalizable candidate, not just the first", async () => {
    const fetchImpl = fakeFetch(200, {
      items: [
        { volumeInfo: { title: "Rayuela", authors: ["Julio Cortázar"] } },
        {
          volumeInfo: {
            title: "Rayuela (ed. 2019)",
            authors: ["Julio Cortázar"],
          },
        },
      ],
    });
    const out = await googleBooksSearchByPublisher(
      "Rayuela",
      ["Julio Cortázar"],
      "Debolsillo",
      { fetchImpl },
    );
    expect(out).toHaveLength(2);
  });

  it("throws GoogleBooksRateLimitError on a 429 response", async () => {
    const fetchImpl = fakeFetch(429);
    await expect(
      googleBooksSearchByPublisher(
        "Rayuela",
        ["Julio Cortázar"],
        "Debolsillo",
        {
          fetchImpl,
        },
      ),
    ).rejects.toBeInstanceOf(GoogleBooksRateLimitError);
  });
});
