import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWishItem, checkOwned } from "./add";

beforeEach(() => vi.clearAllMocks());

describe("createWishItem", () => {
  it("POSTs the snapshot with the given addedVia and returns true", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    global.fetch = fetchMock as unknown as typeof fetch;

    const ok = await createWishItem({
      readerId: "r1",
      addedVia: "isbn",
      bookId: "b1",
      snapshot: {
        bookTitle: "Kindred",
        bookAuthors: ["Octavia Butler"],
        isbn13: "9780807083697",
      },
    });

    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/wishlist-items");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      readerId: "r1",
      addedVia: "isbn",
      bookId: "b1",
      bookTitle: "Kindred",
      isbn13: "9780807083697",
    });
  });

  it("returns false when the request fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false } as Response),
    ) as unknown as typeof fetch;
    const ok = await createWishItem({
      readerId: "r1",
      addedVia: "manual",
      snapshot: { bookTitle: "X" },
    });
    expect(ok).toBe(false);
  });
});

describe("checkOwned", () => {
  it("returns the owned match when a duplicate has copies", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            recommendation: "add-copy",
            matches: [
              { book: { title: "Kentukis" }, existingCopies: 2 },
              { book: { title: "Other" }, existingCopies: 0 },
            ],
          }),
      } as Response),
    ) as unknown as typeof fetch;

    const owned = await checkOwned({ bookTitle: "Kentukis" });
    expect(owned).toEqual({ title: "Kentukis", copies: 2 });
  });

  it("returns null when nothing is owned", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            matches: [{ book: { title: "X" }, existingCopies: 0 }],
          }),
      } as Response),
    ) as unknown as typeof fetch;
    expect(await checkOwned({ bookTitle: "X" })).toBeNull();
  });

  it("never throws — a failed check resolves to null", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("network")),
    ) as unknown as typeof fetch;
    expect(await checkOwned({ bookTitle: "X" })).toBeNull();
  });
});
