import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditBook } from "./edit-book";

/**
 * Component tests for the connected edit container (#15) wired to the design's
 * `EditBookForm`. `fetch` is mocked per-URL so load → edit → save, the re-enrich
 * diff, and remove-cover run in jsdom.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const book = {
  id: "b1",
  title: "El nombre del viento",
  authors: ["Patrick Rothfuss"],
  isbn13: "9780756404741",
  publisher: "DAW",
  publishedYear: 2007,
  categories: ["Fantasía"],
  language: "Español",
  coverUrl: "https://ext/cover.jpg",
  coverSource: "metadata",
};
const copies = [{ id: "c1", bookId: "b1", notes: "" }];
const candidate = { title: "El nombre del viento", publishedYear: 2099 };

const patchBook = vi.fn(() => jsonResponse({ ...book }));
const patchCopy = vi.fn(() => jsonResponse(copies[0]));

beforeEach(() => {
  patchBook.mockClear();
  patchCopy.mockClear();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/books/b1") && method === "GET")
      return jsonResponse(book);
    if (url.endsWith("/api/books/b1/copies")) return jsonResponse(copies);
    if (url.endsWith("/api/shelves")) return jsonResponse([]);
    if (url.includes("/api/enrich")) return jsonResponse({ candidate });
    if (url.endsWith("/api/books/b1") && method === "PATCH") return patchBook();
    if (url.includes("/api/copies/") && method === "PATCH") return patchCopy();
    return jsonResponse({}, 404);
  }) as unknown as typeof fetch;
});

describe("EditBook", () => {
  it("loads the book into the form", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/Título/)).toHaveValue(
        "El nombre del viento",
      ),
    );
  });

  it("saves edits and shows the success state", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.change(screen.getByLabelText(/Título/), {
      target: { value: "Título corregido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(patchBook).toHaveBeenCalledOnce());
    expect(patchCopy).toHaveBeenCalledOnce();
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
  });

  it("opens the re-enrich diff dialog with the differing field", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(
      screen.getByRole("button", { name: /Re-enriquecer desde fuentes/ }),
    );
    expect(await screen.findByText(/campo distinto/)).toBeInTheDocument();
  });

  it("removes the cover", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Quitar" })).toBeNull(),
    );
  });
});
