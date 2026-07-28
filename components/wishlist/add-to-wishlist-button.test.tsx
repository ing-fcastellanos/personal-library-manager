import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddToWishlistButton } from "./add-to-wishlist-button";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));

function postMock() {
  const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function lastPostBody(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
  const call = calls.find((c) => c[0] === "/api/wishlist-items");
  return call ? JSON.parse(call[1].body as string) : null;
}

beforeEach(() => vi.clearAllMocks());

describe("AddToWishlistButton", () => {
  it("creates with the given addedVia when the book is not owned", async () => {
    const fetchMock = postMock();
    render(
      <AddToWishlistButton
        snapshot={{ bookTitle: "Kindred", bookAuthors: ["Octavia Butler"] }}
        addedVia="catalog"
        bookId="b1"
        ownedCopies={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Agregar a deseos/ }));

    await waitFor(() =>
      expect(lastPostBody(fetchMock)).toMatchObject({
        addedVia: "catalog",
        bookId: "b1",
        bookTitle: "Kindred",
      }),
    );
  });

  it("shows the owned warning with the copy count and proceeds on «Agregar igual»", async () => {
    const fetchMock = postMock();
    render(
      <AddToWishlistButton
        snapshot={{ bookTitle: "Kentukis" }}
        addedVia="isbn"
        ownedCopies={2}
      />,
    );

    // Owned → warning instead of an immediate create.
    fireEvent.click(screen.getByRole("button", { name: /Agregar a deseos/ }));
    expect(
      await screen.findByText(/Ya tenés 2 ejemplares/),
    ).toBeInTheDocument();
    expect(lastPostBody(fetchMock)).toBeNull();

    // Proceed anyway → creates, recording the entry point's addedVia.
    fireEvent.click(screen.getByRole("button", { name: /Agregar igual/ }));
    await waitFor(() =>
      expect(lastPostBody(fetchMock)).toMatchObject({ addedVia: "isbn" }),
    );
  });

  it("runs the duplicate pre-check when ownership is unknown", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/books/duplicates")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              matches: [{ book: { title: "Kentukis" }, existingCopies: 1 }],
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true } as Response);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AddToWishlistButton
        snapshot={{ bookTitle: "Kentukis" }}
        addedVia="ai"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Agregar a deseos/ }));

    expect(await screen.findByText(/Ya tenés 1 ejemplar/)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((c) =>
        String(c[0]).startsWith("/api/books/duplicates"),
      ),
    ).toBe(true);
  });
});
