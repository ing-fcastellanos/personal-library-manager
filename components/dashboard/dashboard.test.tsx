import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./dashboard";

/**
 * Component tests for the library dashboard (#27). `fetch` is mocked so the
 * parallel load (books/copies/reading-events/readers) renders in jsdom.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const books = [
  {
    id: "b1",
    title: "Rayuela",
    authorKeys: ["cortazar"],
    categoryKeys: ["ficcion"],
    publisher: "Sudamericana",
  },
  {
    id: "b2",
    title: "Ficciones",
    authorKeys: ["borges"],
    categoryKeys: ["ficcion"],
    publisher: "Emecé",
  },
];
const copies = [
  { id: "c1", bookId: "b1" },
  { id: "c2", bookId: "b1" },
];
const events = [
  {
    id: "e1",
    readerId: "r1",
    bookId: "b1",
    status: "finished",
    dateFinished: "2026-07-06",
    bookTitle: "Rayuela",
    bookAuthors: ["Julio Cortázar"],
  },
];
const readers = [
  { id: "r1", name: "Frank" },
  { id: "r2", name: "Dani" },
];

beforeEach(() => {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/books")) return jsonResponse(books);
    if (url.endsWith("/api/copies")) return jsonResponse(copies);
    if (url.endsWith("/api/reading-events")) return jsonResponse(events);
    if (url.endsWith("/api/readers")) return jsonResponse(readers);
    return jsonResponse({}, false);
  }) as unknown as typeof fetch;
});

// The dashboard commits its KPI grid + per-reader list in one state update
// after the parallel fetch resolves; under load, React's effect scheduling can
// take longer than the default 1000ms findBy* timeout, so wait generously for
// the LAST thing to settle (the per-reader row) before asserting on the rest.
const LONG = { timeout: 3000 };

describe("Dashboard", () => {
  it("renders the real KPIs once loaded", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Tendencias", {}, LONG)).toBeInTheDocument();
    expect(screen.getByText("Libros")).toBeInTheDocument();
    expect(screen.getByText("Ejemplares")).toBeInTheDocument();
    expect(screen.getByText("Leídos")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // real counts rendered
  });

  it("renders the recent-reads and trends sections with real data", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Tendencias", {}, LONG)).toBeInTheDocument();
    expect(screen.getByText("Últimos leídos")).toBeInTheDocument();
    expect(screen.getByText("Rayuela")).toBeInTheDocument(); // b1's finished event
    expect(
      screen.getByRole("link", { name: "Ver historial completo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tendencias")).toBeInTheDocument();
    // "Dani" shows up in both the per-reader list and the trends comparison.
    expect(screen.getAllByText("Dani").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Composición charts with real distributions", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Tendencias", {}, LONG)).toBeInTheDocument();
    expect(screen.getByText("Composición")).toBeInTheDocument();
    expect(screen.getByText("Libros por categoría")).toBeInTheDocument();
    expect(screen.getByText("Libros por autor")).toBeInTheDocument();
    expect(screen.getByText("Libros por editorial")).toBeInTheDocument();
    expect(screen.getByText("Lecturas por categoría")).toBeInTheDocument();
    // b1 (Cortázar, Sudamericana, ficcion) has one finished event.
    expect(screen.getByText("Sudamericana")).toBeInTheDocument();
  });

  it("shows empty states in Composición and Recent Reads when nothing is finished yet", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books")) return jsonResponse(books);
      if (url.endsWith("/api/copies")) return jsonResponse(copies);
      if (url.endsWith("/api/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<Dashboard />);
    // Both the "Lecturas por categoría" chart and the Recent Reads card share
    // this empty-state copy, so there are two matches once both sections render.
    const empties = await screen.findAllByText(
      "Todavía no hay lecturas terminadas.",
      {},
      LONG,
    );
    expect(empties.length).toBeGreaterThanOrEqual(2);
  });

  it("shows an empty state when there are no books", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books")) return jsonResponse([]);
      if (url.endsWith("/api/copies")) return jsonResponse([]);
      if (url.endsWith("/api/reading-events")) return jsonResponse([]);
      if (url.endsWith("/api/readers")) return jsonResponse([]);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<Dashboard />);
    expect(
      await screen.findByText("Tu biblioteca está vacía", {}, LONG),
    ).toBeInTheDocument();
  });

  it("degrades gracefully when a source fails", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/books")) return jsonResponse(books);
      if (url.endsWith("/api/copies"))
        return jsonResponse({ error: "internal" }, false);
      if (url.endsWith("/api/reading-events")) return jsonResponse(events);
      if (url.endsWith("/api/readers")) return jsonResponse(readers);
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(<Dashboard />);
    expect(await screen.findByText("Tendencias", {}, LONG)).toBeInTheDocument();
    expect(screen.getByText("Libros")).toBeInTheDocument();
    expect(screen.getByText("Ejemplares")).toBeInTheDocument();
  });
});
