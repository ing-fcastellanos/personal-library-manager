import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookFields } from "./book-fields";
import type { BookData } from "./types";

/**
 * Component tests for `BookFields` (#22 addition): the plain Editorial input
 * stays the default (add screen), and `enablePublisherCoverSearch` (edit
 * screen only) swaps it for the inline search — editing it triggers a search
 * and a resolved cover updates the form's in-memory state via `onChange`,
 * with nothing persisted (no network call beyond the search itself).
 */

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

function book(over: Partial<BookData> = {}): BookData {
  return {
    title: "Rayuela",
    authors: ["Julio Cortázar"],
    categories: [],
    language: "Español",
    publisher: "Sudamericana",
    ...over,
  };
}

describe("BookFields", () => {
  it("renders a plain Editorial input by default (add screen)", () => {
    render(<BookFields value={book()} onChange={vi.fn()} />);
    const input = screen.getByLabelText("Editorial") as HTMLInputElement;
    expect(input.value).toBe("Sudamericana");
    expect(screen.queryByText(/Buscando portada/)).not.toBeInTheDocument();
  });

  it("edit screen: typing in Editorial keeps the form's value in sync", () => {
    const onChange = vi.fn();
    render(
      <BookFields
        value={book()}
        onChange={onChange}
        enablePublisherCoverSearch
      />,
    );
    fireEvent.change(screen.getByLabelText("Editorial"), {
      target: { value: "Debolsillo" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ publisher: "Debolsillo" }),
    );
  });

  it("edit screen: a resolved single match updates publisher and coverUrl, nothing persisted", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/enrich/cover-by-publisher")) {
        return jsonResponse({
          candidates: [
            {
              id: "1",
              coverUrl: "https://covers.example/deb.jpg",
              caption: "2019 · Debolsillo",
            },
          ],
        });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const onChange = vi.fn();
    render(
      <BookFields
        value={book()}
        onChange={onChange}
        enablePublisherCoverSearch
      />,
    );
    fireEvent.change(screen.getByLabelText("Editorial"), {
      target: { value: "Debolsillo" },
    });

    await screen.findByText("Portada actualizada", {}, { timeout: 1000 });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        publisher: "Debolsillo",
        coverUrl: "https://covers.example/deb.jpg",
      }),
    );
    // Only the search endpoint was called — nothing was saved/persisted.
    const calledUrls = (
      global.fetch as ReturnType<typeof vi.fn>
    ).mock.calls.map((c) => String(c[0]));
    expect(
      calledUrls.every((u) => u.includes("/api/enrich/cover-by-publisher")),
    ).toBe(true);
  });

  it("edit screen: no results leaves the current cover untouched", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse({ candidates: [] }),
    ) as unknown as typeof fetch;
    const onChange = vi.fn();
    render(
      <BookFields
        value={book({ coverUrl: "https://covers.example/original.jpg" })}
        onChange={onChange}
        enablePublisherCoverSearch
      />,
    );
    fireEvent.change(screen.getByLabelText("Editorial"), {
      target: { value: "Editorial inexistente" },
    });
    await waitFor(
      () =>
        expect(
          screen.getByText("No encontramos portada para esa editorial"),
        ).toBeInTheDocument(),
      { timeout: 1000 },
    );
    const coverUrlsSeen = (onChange as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => (c[0] as BookData).coverUrl)
      .filter((u): u is string => u != null);
    expect(
      coverUrlsSeen.every((u) => u === "https://covers.example/original.jpg"),
    ).toBe(true);
  });
});
