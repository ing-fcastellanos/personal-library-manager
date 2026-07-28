import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WishlistView } from "./wishlist-view";
import type { WishlistItem } from "@/lib/types/wishlist-item";

// Active reader = Frank (r1).
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));

function wish(o: Partial<WishlistItem>): WishlistItem {
  return {
    id: "w",
    readerId: "r1",
    bookId: null,
    status: "wanted",
    priority: "normal",
    addedVia: "manual",
    bookTitle: "T",
    bookAuthors: [],
    isbn13: null,
    coverUrl: null,
    titleKey: null,
    authorKeys: [],
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...o,
  };
}

function mockApi(data: {
  items?: unknown[];
  events?: unknown[];
  copies?: unknown[];
  books?: unknown[];
  readers?: unknown[];
  shelves?: unknown[];
}) {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("/wishlist-items")
      ? data.items
      : url.includes("/reading-events")
        ? data.events
        : url.includes("/copies")
          ? data.copies
          : url.includes("/books")
            ? data.books
            : url.includes("/readers")
              ? data.readers
              : url.includes("/shelves")
                ? data.shelves
                : [];
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body ?? []),
    } as Response);
  }) as unknown as typeof fetch;
}

beforeEach(() => vi.clearAllMocks());

describe("WishlistView · Quiero leer", () => {
  it("shows only the active reader's wanted items, hiding finished and other readers'", async () => {
    mockApi({
      items: [
        wish({ id: "w1", readerId: "r1", bookId: "b1", bookTitle: "Rayuela" }),
        wish({ id: "w2", readerId: "r1", bookId: "b2", bookTitle: "Sula" }),
        wish({ id: "w3", readerId: "r2", bookId: "b3", bookTitle: "Kentukis" }),
      ],
      events: [
        {
          id: "e1",
          readerId: "r1",
          bookId: "b2",
          status: "finished",
          bookTitle: "Sula",
          bookAuthors: [],
          isbn13: null,
          coverUrl: null,
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
        },
      ],
    });

    render(<WishlistView initialTab="leer" />);

    expect(await screen.findByText("Rayuela")).toBeInTheDocument();
    expect(screen.queryByText("Sula")).not.toBeInTheDocument(); // finished → gone
    expect(screen.queryByText("Kentukis")).not.toBeInTheDocument(); // other reader
  });
});

describe("WishlistView · Comprar", () => {
  it("groups a book both readers want and drops a book once a copy exists", async () => {
    mockApi({
      items: [
        wish({
          id: "w1",
          readerId: "r1",
          bookId: "b1",
          bookTitle: "Los detectives salvajes",
        }),
        wish({
          id: "w2",
          readerId: "r2",
          bookId: "b1",
          bookTitle: "Los detectives salvajes",
        }),
        wish({
          id: "w3",
          readerId: "r1",
          bookId: "b4",
          bookTitle: "Distancia de rescate",
        }),
      ],
      copies: [
        {
          id: "c1",
          bookId: "b4",
          shelfId: null,
          condition: null,
          acquiredAt: null,
          notes: null,
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
        },
      ],
      readers: [
        { id: "r1", name: "Frank" },
        { id: "r2", name: "Sofía" },
      ],
    });

    render(<WishlistView initialTab="comprar" />);

    // Both readers want it → one grouped entry with the "Los dos" badge.
    expect(
      await screen.findByText("Los detectives salvajes"),
    ).toBeInTheDocument();
    expect(screen.getByText("Los dos")).toBeInTheDocument();
    expect(screen.getByText(/Lo quieren:/)).toBeInTheDocument();

    // A book the household already owns is absent from the buy list.
    expect(screen.queryByText("Distancia de rescate")).not.toBeInTheDocument();
  });
});
