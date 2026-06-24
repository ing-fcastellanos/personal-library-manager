import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddBook } from "./add-book";

/**
 * Component tests for the connected add-book container (#14). `fetch` is mocked
 * per-URL so the search → prefill → validate → duplicate → save flow runs in
 * jsdom against the design's `AddBookForm`.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const candidate = {
  title: "El nombre del viento",
  authors: ["Patrick Rothfuss"],
  isbn13: "9780756404741",
  categories: ["Fantasía"],
  publishedYear: 2007,
};

let duplicatesResponse: unknown = { recommendation: "add-new", matches: [] };
const intake = vi.fn(() =>
  jsonResponse({ book: { id: "b1" }, copy: { id: "c1" } }, 201),
);

beforeEach(() => {
  duplicatesResponse = { recommendation: "add-new", matches: [] };
  intake.mockClear();
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/shelves")) return jsonResponse([]);
    if (url.startsWith("/api/enrich")) return jsonResponse({ candidate });
    if (url.startsWith("/api/books/duplicates"))
      return jsonResponse(duplicatesResponse);
    if (url.startsWith("/api/books/intake")) return intake();
    if (url.startsWith("/api/copies")) return jsonResponse({ id: "c1" }, 201);
    return jsonResponse({}, 404);
  }) as unknown as typeof fetch;
});

function searchIsbn() {
  fireEvent.change(screen.getByLabelText("Código ISBN"), {
    target: { value: "9780756404741" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
}

describe("AddBook", () => {
  it("prefills the form from an ISBN search", async () => {
    render(<AddBook />);
    searchIsbn();
    await waitFor(() =>
      expect(screen.getByLabelText(/Título/)).toHaveValue(
        "El nombre del viento",
      ),
    );
  });

  it("shows a validation error when saving without a title", async () => {
    render(<AddBook />);
    fireEvent.click(
      screen.getByRole("button", { name: /Cargar manualmente sin buscar/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar libro" }));
    expect(
      await screen.findByText("El título es obligatorio."),
    ).toBeInTheDocument();
  });

  it("opens the duplicate dialog on save when a match exists", async () => {
    duplicatesResponse = {
      recommendation: "add-copy",
      matches: [
        {
          book: {
            id: "b1",
            title: "El nombre del viento",
            authors: ["Patrick Rothfuss"],
          },
          existingCopies: 1,
        },
      ],
    };
    render(<AddBook />);
    searchIsbn();
    await waitFor(() =>
      expect(screen.getByLabelText(/Título/)).toHaveValue(
        "El nombre del viento",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar libro" }));
    expect(await screen.findByText("Este libro ya existe")).toBeInTheDocument();
    expect(intake).not.toHaveBeenCalled();
  });

  it("saves via intake and shows success when there is no duplicate", async () => {
    render(<AddBook />);
    searchIsbn();
    await waitFor(() =>
      expect(screen.getByLabelText(/Título/)).toHaveValue(
        "El nombre del viento",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar libro" }));
    await waitFor(() => expect(intake).toHaveBeenCalledOnce());
    expect(await screen.findByText("¡Libro agregado!")).toBeInTheDocument();
  });
});
