import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
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
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

  it("shows a Ver en Goodreads link using the book's ISBN (#34)", async () => {
    render(<BookDetail bookId="b1" />);
    await screen.findByRole("heading", { name: "El nombre del viento" });
    expect(
      screen.getByRole("link", { name: /Ver en Goodreads/ }),
    ).toHaveAttribute(
      "href",
      "https://www.goodreads.com/search?q=9780756404741",
    );
  });

  it("falls back to the title in the Goodreads link with no ISBN", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1"))
        return jsonResponse({ ...book, isbn13: null });
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse(events);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    await screen.findByRole("heading", { name: "El nombre del viento" });
    expect(
      screen.getByRole("link", { name: /Ver en Goodreads/ }),
    ).toHaveAttribute(
      "href",
      "https://www.goodreads.com/search?q=El%20nombre%20del%20viento",
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
    // Active reader (Frank) gets the inline mark button; both rows read
    // "Sin empezar" (no events loaded).
    expect(
      screen.getByRole("button", { name: "Marcar leído" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Sin empezar")).toHaveLength(2);
  });

  it("shows the reader's 'Leído' status without a mark button when finished", async () => {
    // Default fixture: the active reader (r1/Frank) already finished b1.
    render(<BookDetail bookId="b1" />);
    expect(await screen.findByText("Frank")).toBeInTheDocument();
    expect(screen.getByText("Leído")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marcar leído" }),
    ).not.toBeInTheDocument();
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
    // Active reader hasn't finished → the inline mark button is offered.
    const markBtn = await screen.findByRole("button", { name: "Marcar leído" });
    expect(markBtn).toBeEnabled();

    fireEvent.click(markBtn);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Marcar como leído/ }),
    );

    expect(await screen.findByText("Leído")).toBeInTheDocument();
  });

  it("shows a reader's rating and review (#25)", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse([]);
      if (url.endsWith("/reading-events"))
        return jsonResponse([
          {
            id: "e1",
            readerId: "r1",
            bookId: "b1",
            status: "finished",
            rating: 4,
            review: "Bestial el ritmo.",
          },
        ]);
      if (url.endsWith("/api/readers")) return jsonResponse([readers[0]]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(
      await screen.findByRole("img", { name: "4 de 5 estrellas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bestial el ritmo.")).toBeInTheDocument();
  });

  it("lets the active reader edit their rating via PATCH (#25)", async () => {
    const patches: Record<string, unknown>[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse([]);
      if (url.endsWith("/reading-events") && method === "GET")
        return jsonResponse([
          {
            id: "e1",
            readerId: "r1",
            bookId: "b1",
            status: "finished",
            rating: 3,
            review: "ok",
          },
        ]);
      if (url.endsWith("/api/readers")) return jsonResponse([readers[0]]);
      if (url.includes("/api/reading-events/") && method === "PATCH") {
        const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
        patches.push(body);
        return jsonResponse({
          id: "e1",
          readerId: "r1",
          bookId: "b1",
          status: "finished",
          ...body,
          bookTitle: book.title,
          bookAuthors: book.authors,
        });
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(
      await screen.findByRole("img", { name: "3 de 5 estrellas" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "5 estrellas" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Guardar cambios/ }),
    );

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0].rating).toBe(5);
    expect(
      await screen.findByRole("img", { name: "5 de 5 estrellas" }),
    ).toBeInTheDocument();
  });

  it("lists multiple readings in the per-book history (#26)", async () => {
    // Two readings by the same reader (a re-read) → the Historial section appears.
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse([]);
      if (url.endsWith("/reading-events"))
        return jsonResponse([
          {
            id: "e2",
            readerId: "r1",
            bookId: "b1",
            status: "finished",
            rating: 5,
            review: "Mejor en la relectura.",
            dateFinished: "2026-07-06",
            bookTitle: book.title,
            bookAuthors: book.authors,
          },
          {
            id: "e1",
            readerId: "r1",
            bookId: "b1",
            status: "finished",
            rating: 3,
            review: "Primera vuelta.",
            dateFinished: "2024-02-01",
            bookTitle: book.title,
            bookAuthors: book.authors,
          },
        ]);
      if (url.endsWith("/api/readers")) return jsonResponse([readers[0]]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(
      await screen.findByText("Historial de lecturas"),
    ).toBeInTheDocument();
    // The older reading appears only in the history section; the latest (shown in
    // the per-reader summary too) appears in both.
    expect(screen.getByText("Primera vuelta.")).toBeInTheDocument();
    expect(screen.getAllByText("Mejor en la relectura.")).toHaveLength(2);
  });
});
