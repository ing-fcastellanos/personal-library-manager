import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { AddBookByCode } from "./add-book-by-code";

/**
 * Component test for the ISBN barcode flow (#23). The scanner module is mocked so
 * a scan can be injected via the captured `onResult`; `fetch` and `next/navigation`
 * are mocked so scan → enrich → confirm → intake runs in jsdom.
 */

const scan = vi.hoisted(() => ({
  onResult: null as ((isbn: string) => void) | null,
  deny: false,
  stop: vi.fn(),
}));
vi.mock("@/lib/barcode/isbn-scanner", () => ({
  createIsbnScanner: () => ({
    start: async (_v: unknown, cb: (isbn: string) => void) => {
      scan.onResult = cb;
      if (scan.deny) throw new Error("denied");
    },
    stop: scan.stop,
  }),
}));

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

const DUNE = "9780307474728";
let calls: Array<{ url: string; method: string }>;
let dupMatches: unknown[];

beforeEach(() => {
  calls = [];
  dupMatches = [];
  scan.onResult = null;
  scan.deny = false;
  push.mockReset();
  sessionStorage.clear();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.endsWith("/api/shelves")) return json([]);
    if (url.includes("/api/enrich"))
      return json({
        candidate: {
          title: "Dune",
          authors: ["Frank Herbert"],
          isbn13: DUNE,
          coverUrl: "c",
        },
      });
    if (url.includes("/api/books/duplicates"))
      return json({ matches: dupMatches });
    if (url.endsWith("/api/books/intake"))
      return json({ book: { id: "b1" }, copy: { id: "c1" } }, 201);
    if (url.endsWith("/api/copies")) return json({ id: "cp1" }, 201);
    return json({});
  }) as unknown as typeof fetch;
});

/** Wait for the scanner to register, then inject a decoded ISBN. */
async function injectScan(isbn: string) {
  await waitFor(() => expect(scan.onResult).not.toBeNull());
  await act(async () => {
    scan.onResult!(isbn);
  });
}

describe("AddBookByCode", () => {
  it("scans → confirms → intakes to the batch shelf", async () => {
    render(<AddBookByCode />);
    await injectScan(DUNE);
    fireEvent.click(await screen.findByText("Dune"));
    fireEvent.click(screen.getByRole("button", { name: /^Agregar$/ }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith("/api/books/intake"))).toBe(true),
    );
    expect(
      await screen.findByText(/Terminar · 1 agregados/),
    ).toBeInTheDocument();
  });

  it("discard keeps scanning and saves nothing", async () => {
    render(<AddBookByCode />);
    await injectScan(DUNE);
    fireEvent.click(await screen.findByRole("button", { name: /Descartar/ }));
    expect(calls.some((c) => c.url.endsWith("/api/books/intake"))).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("finish persists outcomes and routes to the summary", async () => {
    render(<AddBookByCode />);
    await injectScan(DUNE);
    fireEvent.click(await screen.findByText("Dune"));
    fireEvent.click(screen.getByRole("button", { name: /^Agregar$/ }));
    await screen.findByText(/Terminar · 1 agregados/);
    fireEvent.click(screen.getByRole("button", { name: /Terminar/ }));
    expect(push).toHaveBeenCalledWith("/agregar/resumen");
    const saved = JSON.parse(sessionStorage.getItem("plm:lastImport") ?? "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ result: "added", bookId: "b1" });
  });

  it("manual ISBN entry resolves through the same path", async () => {
    render(<AddBookByCode />);
    fireEvent.change(screen.getByLabelText("ISBN a mano"), {
      target: { value: DUNE },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar/ }));
    fireEvent.click(await screen.findByText("Dune"));
    fireEvent.click(screen.getByRole("button", { name: /^Agregar$/ }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith("/api/books/intake"))).toBe(true),
    );
  });

  it("shows the manual fallback when the camera is denied", async () => {
    scan.deny = true;
    render(<AddBookByCode />);
    expect(
      await screen.findByText(/Sin acceso a la cámara/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("ISBN a mano")).toBeInTheDocument();
  });

  it("a duplicate offers add-as-copy", async () => {
    dupMatches = [
      {
        book: { id: "d1", title: "Dune", authors: ["Frank Herbert"] },
        existingCopies: 2,
      },
    ];
    render(<AddBookByCode />);
    await injectScan(DUNE);
    expect(await screen.findByText(/Ya lo tenés/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Agregar copia/ }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith("/api/copies"))).toBe(true),
    );
  });

  it("ignores a second scan while a confirm card is open", async () => {
    render(<AddBookByCode />);
    await injectScan(DUNE);
    await screen.findByText("Dune");
    const enrichBefore = calls.filter((c) =>
      c.url.includes("/api/enrich"),
    ).length;
    await act(async () => {
      scan.onResult!("9791234567896");
    });
    expect(calls.filter((c) => c.url.includes("/api/enrich")).length).toBe(
      enrichBefore,
    );
  });
});
