import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ReadingHistory } from "./reading-history";
import type { ReadingEvent } from "@/lib/types/reading-event";

/**
 * Component tests for the global reading history timeline (#26). Auth, toast, CTA
 * and navigation are mocked so the timeline + edit flow runs in jsdom.
 */

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Sofía" }, loading: false }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/auth/write-cta", () => ({
  WriteCta: () => <button type="button">Iniciar sesión</button>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const mk = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: "2026-07-06",
  rating: 4,
  review: null,
  bookTitle: "Rayuela",
  bookAuthors: ["Julio Cortázar"],
  isbn13: null,
  coverUrl: null,
  createdAt: "2026-07-06T00:00:00Z",
  updatedAt: "",
  ...p,
});

const readers = [
  { id: "r1", name: "Sofía" },
  { id: "r2", name: "Mateo" },
];

let events: ReadingEvent[];
let patches: Array<{ url: string; body: Record<string, unknown> }>;

beforeEach(() => {
  events = [
    mk({ id: "a", readerId: "r1", bookTitle: "Rayuela" }),
    mk({ id: "b", readerId: "r2", bookTitle: "Ficciones", rating: 5 }),
  ];
  patches = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/reading-events") && method === "GET")
      return json(events);
    if (url.endsWith("/api/readers")) return json(readers);
    if (url.endsWith("/copies")) return json([]);
    if (url.includes("/api/reading-events/") && method === "PATCH") {
      const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
      patches.push({ url, body });
      return json({ ...events[0], ...body });
    }
    return json({});
  }) as unknown as typeof fetch;
});

describe("ReadingHistory", () => {
  it("renders all readings", async () => {
    render(<ReadingHistory />);
    expect(await screen.findByText("Rayuela")).toBeInTheDocument();
    expect(screen.getByText("Ficciones")).toBeInTheDocument();
  });

  it("filters by reader", async () => {
    render(<ReadingHistory />);
    await screen.findByText("Rayuela");
    fireEvent.change(screen.getByLabelText("Filtrar por lector"), {
      target: { value: "r2" },
    });
    expect(screen.queryByText("Rayuela")).not.toBeInTheDocument();
    expect(screen.getByText("Ficciones")).toBeInTheDocument();
  });

  it("shows a no-match state and clears filters", async () => {
    render(<ReadingHistory />);
    await screen.findByText("Rayuela");
    fireEvent.change(screen.getByLabelText("Filtrar por calificación"), {
      target: { value: "1" }, // no event has rating 1
    });
    expect(
      screen.getByText(/No hay lecturas para esos filtros/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Limpiar filtros/ }));
    expect(screen.getByText("Rayuela")).toBeInTheDocument();
  });

  it("shows the empty state with no readings", async () => {
    events = [];
    render(<ReadingHistory />);
    expect(
      await screen.findByText(/Todavía no hay lecturas/),
    ).toBeInTheDocument();
  });

  it("edits an own entry via PATCH", async () => {
    render(<ReadingHistory />);
    await screen.findByText("Rayuela");
    // Only the active reader's (r1) entry is editable.
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Guardar cambios/ }),
    );
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0].url).toContain("/api/reading-events/a");
  });
});
