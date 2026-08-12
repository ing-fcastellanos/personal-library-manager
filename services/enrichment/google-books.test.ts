import { describe, it, expect, vi } from "vitest";
import {
  googleBooksSearch,
  googleBooksByIsbn,
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
