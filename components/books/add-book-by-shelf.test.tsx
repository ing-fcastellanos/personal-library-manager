import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddBookByShelf } from "./add-book-by-shelf";

/**
 * Component test for the batch shelf flow (#21b). `fetch` and `next/navigation`
 * are mocked so the whole flow runs in jsdom: a 3-book shelf splits into one auto,
 * one low-confidence (review queue), and one duplicate (bulk group); the auto
 * preview adds via intake, the review item confirms via intake, and the duplicate
 * group adds via copies.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const shelfBooks = {
  books: [
    {
      title: "Dune",
      authors: ["Herbert"],
      confidence: 0.95,
      sourceProvider: "openai",
    },
    {
      title: "Blurry",
      authors: ["X"],
      confidence: 0.4,
      sourceProvider: "openai",
    },
    {
      title: "Duplicado",
      authors: ["Z"],
      confidence: 0.95,
      sourceProvider: "openai",
    },
  ],
};

let calls: Array<{ url: string; method: string; body: unknown }>;

beforeEach(() => {
  calls = [];
  push.mockReset();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, method, body });
    if (url.endsWith("/api/shelves")) return json([]);
    if (url.endsWith("/api/ai/identify-shelf")) return json(shelfBooks);
    if (url.includes("/api/enrich")) {
      if (url.includes("Dune"))
        return json({
          candidates: [{ title: "Dune", authors: ["Herbert"], coverUrl: "c" }],
        });
      if (url.includes("Blurry"))
        return json({
          candidates: [
            { title: "Blurry Book", authors: ["X"] },
            { title: "Blurry Alt", authors: ["Y"] },
          ],
        });
      if (url.includes("Duplicado"))
        return json({ candidates: [{ title: "Duplicado", authors: ["Z"] }] });
      return json({ candidates: [] });
    }
    if (url.includes("/api/books/duplicates")) {
      if (url.includes("Duplicado"))
        return json({
          matches: [
            {
              book: { id: "d1", title: "Duplicado", authors: ["Z"] },
              existingCopies: 2,
            },
          ],
        });
      return json({ matches: [] });
    }
    if (url.endsWith("/api/books/intake"))
      return json({ book: { id: "b1" } }, 201);
    if (url.endsWith("/api/copies")) return json({ id: "c1" }, 201);
    return json({});
  }) as unknown as typeof fetch;
});

function capture() {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["x"], "shelf.jpg", { type: "image/jpeg" })] },
  });
}

describe("AddBookByShelf", () => {
  it("processes a shelf into auto + review + duplicates and saves each path", async () => {
    render(<AddBookByShelf />);
    capture();

    // results: 1 auto, 2 to review (1 queue + 1 duplicate)
    expect(
      await screen.findByText("1 listos para agregar", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();

    // add the auto book → intake for Dune
    fireEvent.click(screen.getByRole("button", { name: /Agregar los 1/ }));

    // review queue: the low-confidence book, pre-filled with its enrichment best
    expect(await screen.findByDisplayValue("Blurry Book")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    // duplicates group → add all as copy
    fireEvent.click(
      await screen.findByRole("button", { name: /Agregar como copia/ }),
    );

    await screen.findByText("Listo");

    const intakes = calls.filter((c) => c.url.endsWith("/api/books/intake"));
    expect(
      intakes.map((c) => (c.body as { book: { title: string } }).book.title),
    ).toEqual(expect.arrayContaining(["Dune", "Blurry Book"]));
    const copies = calls.filter((c) => c.url.endsWith("/api/copies"));
    expect(copies[0]?.body).toMatchObject({ bookId: "d1" });
  });

  it("shows an empty state when no books are recognized", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/shelves")) return json([]);
      if (url.endsWith("/api/ai/identify-shelf")) return json({ books: [] });
      return json({});
    }) as unknown as typeof fetch;
    render(<AddBookByShelf />);
    capture();
    expect(
      await screen.findByText("No se reconocieron libros"),
    ).toBeInTheDocument();
  });
});
