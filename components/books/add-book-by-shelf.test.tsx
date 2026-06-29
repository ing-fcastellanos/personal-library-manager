import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  sessionStorage.clear();
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

    // add the auto book → intake for Dune, then back to the hub (not done)
    fireEvent.click(screen.getByRole("button", { name: /Agregar los 1/ }));

    // the hub now shows only the review entry — enter it
    fireEvent.click(await screen.findByRole("button", { name: /Revisar/ }));

    // review queue: the low-confidence book — its enrichment best shows as the
    // candidate card (edit is opt-in, so it is text, not an input).
    expect(await screen.findByText("Blurry Book")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/ }));

    // duplicates group → add all as copy
    fireEvent.click(
      await screen.findByRole("button", { name: /Agregar como copia/ }),
    );

    // all buckets resolved → navigates to the shared import summary
    await waitFor(() => expect(push).toHaveBeenCalledWith("/agregar/resumen"));

    const intakes = calls.filter((c) => c.url.endsWith("/api/books/intake"));
    expect(
      intakes.map((c) => (c.body as { book: { title: string } }).book.title),
    ).toEqual(expect.arrayContaining(["Dune", "Blurry Book"]));
    const copies = calls.filter((c) => c.url.endsWith("/api/copies"));
    expect(copies[0]?.body).toMatchObject({ bookId: "d1" });

    // the summary was persisted: added (Dune, Blurry Book) + a copy (Duplicado)
    const saved = JSON.parse(
      sessionStorage.getItem("plm:lastImport") ?? "[]",
    ) as Array<{ title: string; result: string }>;
    expect(saved.map((o) => o.result)).toEqual(
      expect.arrayContaining(["added", "added", "added_as_copy"]),
    );
  });

  function mockTwoAuto() {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, method, body });
      if (url.endsWith("/api/shelves")) return json([]);
      if (url.endsWith("/api/ai/identify-shelf"))
        return json({
          books: [
            {
              title: "Dune",
              authors: ["Herbert"],
              confidence: 0.95,
              sourceProvider: "openai",
            },
            {
              title: "Hyperion",
              authors: ["Simmons"],
              confidence: 0.95,
              sourceProvider: "openai",
            },
          ],
        });
      if (url.includes("/api/enrich")) {
        if (url.includes("Dune"))
          return json({
            candidates: [
              {
                title: "Dune",
                authors: ["Herbert"],
                description: "Epic desert saga.",
              },
            ],
          });
        if (url.includes("Hyperion"))
          return json({
            candidates: [{ title: "Hyperion", authors: ["Simmons"] }],
          });
        return json({ candidates: [] });
      }
      if (url.includes("/api/books/duplicates")) return json({ matches: [] });
      if (url.endsWith("/api/books/intake"))
        return json({ book: { id: "b1" } }, 201);
      return json({});
    }) as unknown as typeof fetch;
  }

  it("cherry-picks: toggling a book out excludes it from intake", async () => {
    mockTwoAuto();
    render(<AddBookByShelf />);
    capture();
    await screen.findByText("2 listos para agregar");
    expect(
      screen.getByRole("button", { name: /Agregar los 2/ }),
    ).toBeInTheDocument();

    // toggle Hyperion out of the selection
    fireEvent.click(screen.getByRole("checkbox", { name: /Incluir Hyperion/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Agregar los 1/ }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/agregar/resumen"));
    const intakes = calls.filter((c) => c.url.endsWith("/api/books/intake"));
    expect(intakes).toHaveLength(1);
    expect((intakes[0].body as { book: { title: string } }).book.title).toBe(
      "Dune",
    );
  });

  it("opens the full-detail dialog for a book", async () => {
    mockTwoAuto();
    render(<AddBookByShelf />);
    capture();
    await screen.findByText("2 listos para agregar");
    fireEvent.click(screen.getByRole("button", { name: /Ver datos de Dune/ }));
    expect(await screen.findByText("Epic desert saga.")).toBeInTheDocument();
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

  // ── title-only enrichment fallback ────────────────────────────────────────
  // One confident book whose author the AI misread: the title+author query
  // (contains "Wrong") returns nothing; the title-only retry optionally finds
  // the real book.
  function mockMisreadAuthor({ titleOnly }: { titleOnly: boolean }) {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, method, body });
      if (url.endsWith("/api/shelves")) return json([]);
      if (url.endsWith("/api/ai/identify-shelf"))
        return json({
          books: [
            {
              title: "Territorio Comanche",
              authors: ["Wrong Author"],
              confidence: 0.95,
              sourceProvider: "openai",
            },
          ],
        });
      if (url.includes("/api/enrich")) {
        if (url.includes("Wrong")) return json({ candidates: [] }); // combined
        // title-only retry
        return json({
          candidates: titleOnly
            ? [
                {
                  title: "Territorio Comanche",
                  authors: ["Arturo Pérez-Reverte"],
                },
              ]
            : [],
        });
      }
      if (url.includes("/api/books/duplicates")) return json({ matches: [] });
      return json({});
    }) as unknown as typeof fetch;
  }

  it("title-only fallback recovers a misread author into low-confidence review", async () => {
    mockMisreadAuthor({ titleOnly: true });
    render(<AddBookByShelf />);
    capture();

    // recovered → review queue (not auto-added, not the no_match form)
    fireEvent.click(
      await screen.findByRole("button", { name: /Revisar/ }, { timeout: 4000 }),
    );
    expect(await screen.findByText("Baja confianza")).toBeInTheDocument();
    expect(screen.queryByText("Sin metadata")).not.toBeInTheDocument();
    // the real book recovered by title alone is offered as the candidate
    expect(screen.getByText("Arturo Pérez-Reverte")).toBeInTheDocument();

    // two enrich calls: combined (with author) then title-only (without)
    const enrich = calls.filter((c) => c.url.includes("/api/enrich"));
    expect(enrich).toHaveLength(2);
    expect(enrich[1].url).not.toContain("Wrong");
  });

  it("does not retry title-only when the combined query already matched", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, method, body });
      if (url.endsWith("/api/shelves")) return json([]);
      if (url.endsWith("/api/ai/identify-shelf"))
        return json({
          books: [
            {
              title: "Dune",
              authors: ["Herbert"],
              confidence: 0.95,
              sourceProvider: "openai",
            },
          ],
        });
      if (url.includes("/api/enrich"))
        return json({ candidates: [{ title: "Dune", authors: ["Herbert"] }] });
      if (url.includes("/api/books/duplicates")) return json({ matches: [] });
      return json({});
    }) as unknown as typeof fetch;
    render(<AddBookByShelf />);
    capture();
    await screen.findByText("1 listos para agregar", {}, { timeout: 4000 });
    const enrich = calls.filter((c) => c.url.includes("/api/enrich"));
    expect(enrich).toHaveLength(1); // no title-only retry
  });

  it("stays no_match when the title-only retry also finds nothing", async () => {
    mockMisreadAuthor({ titleOnly: false });
    render(<AddBookByShelf />);
    capture();
    fireEvent.click(
      await screen.findByRole("button", { name: /Revisar/ }, { timeout: 4000 }),
    );
    expect(await screen.findByText("Sin metadata")).toBeInTheDocument();
    const enrich = calls.filter((c) => c.url.includes("/api/enrich"));
    expect(enrich).toHaveLength(2); // tried combined + title-only
  });
});
