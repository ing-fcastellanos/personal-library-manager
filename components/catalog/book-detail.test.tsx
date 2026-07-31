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
const useAuthMock = vi.hoisted(() => ({
  reader: { id: "r1", name: "Frank" } as { id: string; name: string } | null,
}));
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: useAuthMock.reader, loading: false }),
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
  useAuthMock.reader = { id: "r1", name: "Frank" };
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

describe("BookDetail · Préstamos (#39)", () => {
  it("lending an available copy shows its loan card and the return action", async () => {
    let posted: Record<string, unknown> | null = null;
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans") && method === "GET")
        return jsonResponse([]);
      if (url.endsWith("/api/loans") && method === "POST") {
        posted = JSON.parse(String(init?.body));
        return jsonResponse({
          id: "l1",
          ...posted,
          borrowerKey: "juan-perez",
          returnedAt: null,
          bookTitle: book.title,
          bookAuthors: book.authors,
          createdAt: "",
          updatedAt: "",
        });
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    fireEvent.click(await screen.findByRole("button", { name: /Prestar/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Nombre de quien/), {
      target: { value: "Juan Pérez" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Prestar «El nombre del viento»",
      }),
    );

    await waitFor(() => expect(posted?.borrowerName).toBe("Juan Pérez"));
    expect(await screen.findByText("Prestado a")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /como devuelto/ }),
    ).toBeInTheDocument();
  });

  it("shows a loan card with Devolver for a copy already on loan, and returning it clears the state", async () => {
    let returned: Record<string, unknown> | null = null;
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans") && method === "GET")
        return jsonResponse([
          {
            id: "l1",
            copyId: "c1",
            borrowerName: "Malena Ruiz",
            borrowerKey: "malena-ruiz",
            loanedAt: "2026-07-01",
            dueDate: null,
            returnedAt: null,
            notes: null,
            bookTitle: book.title,
            bookAuthors: book.authors,
            createdAt: "",
            updatedAt: "",
          },
        ]);
      if (url.endsWith("/return")) {
        const body = JSON.parse(String(init?.body)) as { returnedAt: string };
        returned = body;
        return jsonResponse({
          id: "l1",
          copyId: "c1",
          borrowerName: "Malena Ruiz",
          borrowerKey: "malena-ruiz",
          loanedAt: "2026-07-01",
          dueDate: null,
          returnedAt: body.returnedAt,
          notes: null,
          bookTitle: book.title,
          bookAuthors: book.authors,
          createdAt: "",
          updatedAt: "",
        });
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(await screen.findByText("Malena Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Prestado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /como devuelto/ }));
    await waitFor(() => expect(returned).not.toBeNull());
    expect(
      await screen.findByRole("button", { name: /Prestar/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Malena Ruiz")).not.toBeInTheDocument();
  });

  it("gates lending behind a signed-in reader", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans")) return jsonResponse([]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;
    useAuthMock.reader = null;

    render(<BookDetail bookId="b1" />);
    fireEvent.click(await screen.findByRole("button", { name: /Prestar/ }));
    expect(
      await screen.findByText("Iniciá sesión para guardar"),
    ).toBeInTheDocument();
  });
});

describe("BookDetail · Series (#38)", () => {
  it("shows the Serie section with owned/missing volumes for a book in a series", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans")) return jsonResponse([]);
      if (url.endsWith("/api/series"))
        return jsonResponse([
          {
            id: "s1",
            name: "El Señor de los Anillos",
            volumes: [
              {
                position: 1,
                title: book.title,
                authors: book.authors,
                bookId: "b1",
              },
              {
                position: 2,
                title: "Las Dos Torres",
                authors: [],
                bookId: null,
              },
            ],
            createdAt: "",
            updatedAt: "",
          },
        ]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    expect(
      await screen.findByText("Serie · El Señor de los Anillos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tenés")).toBeInTheDocument();
    expect(screen.getByText("Las Dos Torres")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar «Las Dos Torres» a deseos" }),
    ).toBeInTheDocument();
  });

  it("adding a missing volume to the wishlist creates the item from its snapshot", async () => {
    const posted: Record<string, unknown>[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans")) return jsonResponse([]);
      if (url.endsWith("/api/series") && method === "GET")
        return jsonResponse([
          {
            id: "s1",
            name: "Saga",
            volumes: [
              {
                position: 1,
                title: book.title,
                authors: book.authors,
                bookId: "b1",
              },
              {
                position: 2,
                title: "El Retorno del Rey",
                authors: ["Tolkien"],
                isbn13: "9780007121066",
                bookId: null,
              },
            ],
            createdAt: "",
            updatedAt: "",
          },
        ]);
      if (url.includes("/api/books/duplicates"))
        return jsonResponse(null, false);
      if (url.endsWith("/api/wishlist-items") && method === "POST") {
        posted.push(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "w1" }, true);
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Agregar «El Retorno del Rey» a deseos",
      }),
    );
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].bookTitle).toBe("El Retorno del Rey");
    expect(posted[0].isbn13).toBe("9780007121066");
  });

  it("a book in no series offers to add it to one", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books/b1")) return jsonResponse(book);
      if (url.endsWith("/copies")) return jsonResponse(copies);
      if (url.endsWith("/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      if (url.endsWith("/api/loans")) return jsonResponse([]);
      if (url.endsWith("/api/series")) return jsonResponse([]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<BookDetail bookId="b1" />);
    const addBtn = await screen.findByRole("button", {
      name: "Agregar a una serie",
    });
    fireEvent.click(addBtn);
    expect(
      await screen.findByText(`Agregar «${book.title}» a una serie`),
    ).toBeInTheDocument();
  });
});
