import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BookDetail } from "./book-detail";

/**
 * Component tests for the book detail scaffold (#17). `fetch` and `next/link`
 * are mocked so the composed load (book + copies + events + readers) renders in
 * jsdom. Auth/toast/CTA are mocked for the "marcar como leído" action (#24).
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/auth/write-cta", () => ({
  WriteCta: () => <button type="button">Iniciar sesión</button>,
}));

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const book = {
  id: "b1",
  title: "El nombre del viento",
  subtitle: null,
  authors: ["Patrick Rothfuss"],
  publisher: "DAW",
  publishedYear: 2007,
  isbn13: "9780756404741",
  categories: ["Fantasía"],
  coverUrl: null,
  description: "Kvothe narra su vida.",
};
const copies = [
  { id: "c1", bookId: "b1", condition: "Bueno", notes: "tapa dura" },
];
const events = [{ id: "e1", readerId: "r1", bookId: "b1", status: "finished" }];
const readers = [
  { id: "r1", name: "Frank" },
  { id: "r2", name: "Dang" },
];

let found = true;

beforeEach(() => {
  found = true;
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/books/b1"))
      return jsonResponse(found ? book : null, found);
    if (url.endsWith("/copies")) return jsonResponse(copies);
    if (url.endsWith("/reading-events")) return jsonResponse(events);
    if (url.endsWith("/api/readers")) return jsonResponse(readers);
    return jsonResponse({}, false);
  }) as unknown as typeof fetch;
});

describe("BookDetail", () => {
  it("renders the book, copies, and per-reader reading status", async () => {
    render(<BookDetail bookId="b1" />);
    expect(
      await screen.findByRole("heading", { name: "El nombre del viento" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ejemplares · 1/)).toBeInTheDocument();
    expect(screen.getByText("Frank")).toBeInTheDocument();
    expect(screen.getByText("Leído")).toBeInTheDocument(); // Frank finished
    // Edit link targets the editor.
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/libros/b1/editar",
    );
  });

  it("shows a not-found state", async () => {
    found = false;
    render(<BookDetail bookId="missing" />);
    expect(
      await screen.findByText("No encontramos este libro"),
    ).toBeInTheDocument();
  });

  it("stays resilient when copies/reading-events 500 (does not crash)", async () => {
    // A missing Firestore index surfaces as a 500 returning `{"error":"internal"}`.
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies"))
        return jsonResponse({ error: "internal" }, false);
      if (url.endsWith("/reading-events"))
        return jsonResponse({ error: "internal" }, false);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    // The book still renders; the failed lists degrade to empty, not a crash.
    expect(
      await screen.findByRole("heading", { name: "El nombre del viento" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ejemplares · 0/)).toBeInTheDocument();
    expect(screen.getByText("Sin ejemplares.")).toBeInTheDocument();
    expect(screen.getAllByText("Sin empezar")).toHaveLength(2); // both readers
  });

  it("enables the 'Marcar como leído' action", async () => {
    render(<BookDetail bookId="b1" />);
    const btn = await screen.findByRole("button", {
      name: /Marcar como leído/,
    });
    expect(btn).toBeEnabled();
  });

  it("marking a reading updates the reader's status to Leído", async () => {
    // Start with no events so the reader shows "Sin empezar".
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse([]);
      if (url.endsWith("/reading-events") && method === "GET")
        return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse([readers[0]]);
      if (url.endsWith("/api/reading-events") && method === "POST")
        return jsonResponse({
          id: "e9",
          readerId: "r1",
          bookId: "b1",
          status: "finished",
          bookTitle: book.title,
          bookAuthors: book.authors,
          createdAt: "",
          updatedAt: "",
        });
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(await screen.findByText("Frank")).toBeInTheDocument();
    expect(screen.getByText("Sin empezar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Marcar como leído/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Marcar como leído/ }),
    );

    expect(await screen.findByText("Leído")).toBeInTheDocument();
  });
});
