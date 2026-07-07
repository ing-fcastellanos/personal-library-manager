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
const events = [{ id: "e1", readerId: "r1", bookId: "b1", status: "finished" }];
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

describe("Dashboard", () => {
  it("renders the real KPIs once loaded", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Libros")).toBeInTheDocument();
    expect(screen.getByText("Ejemplares")).toBeInTheDocument();
    expect(screen.getByText("Leídos")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // real counts rendered
    expect(screen.getByText("Frank")).toBeInTheDocument();
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
      await screen.findByText("Tu biblioteca está vacía"),
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
    expect(await screen.findByText("Libros")).toBeInTheDocument();
    expect(screen.getByText("Ejemplares")).toBeInTheDocument();
  });
});
