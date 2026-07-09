import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadingExport } from "./reading-export";
import type { ReadingEvent } from "@/lib/types/reading-event";

/**
 * Component tests for the CSV export tab (#34). Auth is mocked so the
 * pending-toggle/publish-link ownership gate runs in jsdom; `URL.createObjectURL`
 * is stubbed since jsdom doesn't implement it.
 */
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Sofía" }, loading: false }),
}));

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
  publishPending: false,
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
let createdBlobs: Blob[];

beforeEach(() => {
  events = [
    mk({ id: "a", readerId: "r1", bookTitle: "Rayuela" }),
    mk({ id: "b", readerId: "r2", bookTitle: "Ficciones", rating: 5 }),
  ];
  patches = [];
  createdBlobs = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/reading-events") && method === "GET")
      return json(events);
    if (url.endsWith("/api/readers")) return json(readers);
    if (url.includes("/api/reading-events/") && method === "PATCH") {
      const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
      patches.push({ url, body });
      return json({ ...events[0], ...body });
    }
    return json({});
  }) as unknown as typeof fetch;

  global.URL.createObjectURL = vi.fn((blob: Blob) => {
    createdBlobs.push(blob);
    return "blob:mock";
  });
  global.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

async function blobText(blob: Blob): Promise<string> {
  return blob.text();
}

describe("ReadingExport", () => {
  it("renders both readings by default", async () => {
    render(<ReadingExport />);
    expect(await screen.findByText("Rayuela")).toBeInTheDocument();
    expect(screen.getByText("Ficciones")).toBeInTheDocument();
  });

  it("narrows the set with the reader filter, same as Historial", async () => {
    render(<ReadingExport />);
    await screen.findByText("Rayuela");
    fireEvent.change(screen.getByLabelText("Filtrar por lector"), {
      target: { value: "r2" },
    });
    expect(screen.queryByText("Rayuela")).not.toBeInTheDocument();
    expect(screen.getByText("Ficciones")).toBeInTheDocument();
  });

  it("downloads a CSV built from only the currently-filtered events", async () => {
    render(<ReadingExport />);
    await screen.findByText("Rayuela");
    fireEvent.change(screen.getByLabelText("Filtrar por lector"), {
      target: { value: "r1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Descargar CSV/ }));
    await waitFor(() => expect(createdBlobs).toHaveLength(1));
    const text = await blobText(createdBlobs[0]);
    expect(text).toContain("Rayuela");
    expect(text).not.toContain("Ficciones");
  });

  it("disables the download button when no events match the filters", async () => {
    render(<ReadingExport />);
    await screen.findByText("Rayuela");
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2099-01-01" },
    });
    expect(
      await screen.findByText(/No hay lecturas para exportar/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Descargar CSV/ }),
    ).toBeDisabled();
  });

  it("toggles pending-to-publish on an own entry via PATCH", async () => {
    render(<ReadingExport />);
    await screen.findByText("Rayuela");
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0].body).toEqual({ publishPending: true });
  });
});
