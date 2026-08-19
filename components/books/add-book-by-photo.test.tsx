import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddBookByPhoto } from "./add-book-by-photo";

/**
 * Component test for add-by-photo (#20). `fetch` and `next/navigation` are mocked
 * so the capture → analyze → review → save flow runs in jsdom: identify returns a
 * best + alternative, save runs intake then uploads the photo as the cover.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const identifyResponse = {
  aiConfidence: 0.9,
  sourceProvider: "openai",
  best: { title: "Dune", authors: ["Frank Herbert"], publishedYear: 1965 },
  alternatives: [
    { title: "Dune Messiah", authors: ["Frank Herbert"], publishedYear: 1969 },
  ],
};

let calls: Array<{ url: string; method: string; body?: unknown }>;

beforeEach(() => {
  calls = [];
  push.mockReset();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.endsWith("/api/shelves")) return jsonResponse([]);
    if (url.endsWith("/api/ai/identify")) return jsonResponse(identifyResponse);
    if (url.includes("/api/books/duplicates"))
      return jsonResponse({ matches: [] });
    if (url.endsWith("/api/books/intake"))
      return jsonResponse({ book: { id: "b1" } }, 201);
    if (url.match(/\/api\/books\/b1\/cover$/))
      return jsonResponse({ coverUrl: "x" });
    return jsonResponse({});
  }) as unknown as typeof fetch;
});

function capturePhoto() {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(["fake"], "book.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AddBookByPhoto", () => {
  it("analyzes a photo and renders the best candidate", async () => {
    render(<AddBookByPhoto />);
    capturePhoto();
    expect(
      await screen.findByDisplayValue("Dune", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Guardar libro/ }),
    ).toBeInTheDocument();
  });

  it("picking an alternative updates the form", async () => {
    render(<AddBookByPhoto />);
    capturePhoto();
    await screen.findByDisplayValue("Dune");
    fireEvent.click(screen.getByText("Dune Messiah"));
    expect(await screen.findByDisplayValue("Dune Messiah")).toBeInTheDocument();
  });

  it("saving runs intake then uploads the photo as cover", async () => {
    render(<AddBookByPhoto />);
    capturePhoto();
    await screen.findByDisplayValue("Dune");
    fireEvent.click(screen.getByRole("button", { name: /Guardar libro/ }));
    await waitFor(() => {
      expect(calls.some((c) => c.url.endsWith("/api/books/intake"))).toBe(true);
      expect(
        calls.some((c) => c.url.match(/\/api\/books\/b1\/cover$/)),
      ).toBeTruthy();
    });
    expect(push).toHaveBeenCalledWith("/agregar/resumen");
  });

  it("marks the uploaded cover as ai-photo, not a deliberate user upload (#20)", async () => {
    render(<AddBookByPhoto />);
    capturePhoto();
    await screen.findByDisplayValue("Dune");
    fireEvent.click(screen.getByRole("button", { name: /Guardar libro/ }));
    await waitFor(() => {
      const coverCall = calls.find((c) =>
        c.url.match(/\/api\/books\/b1\/cover$/),
      );
      expect((coverCall?.body as { source?: string } | undefined)?.source).toBe(
        "ai-photo",
      );
    });
  });

  /**
   * A depleted/unavailable AI layer used to render as "la foto salió borrosa …
   * probá con más luz", sending the reader to retake photos forever for a
   * condition no photo can fix. These lock the distinction in.
   */
  describe("when identification fails", () => {
    function identifyReturns(status: number) {
      global.fetch = vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/shelves")) return jsonResponse([]);
        if (url.endsWith("/api/ai/identify")) return jsonResponse({}, status);
        return jsonResponse({});
      }) as unknown as typeof fetch;
    }

    it("says the service is unavailable on 503, and never blames the photo", async () => {
      identifyReturns(503);
      render(<AddBookByPhoto />);
      capturePhoto();

      await screen.findByText(/El servicio no está disponible/);
      expect(screen.getByText(/No es tu foto/)).toBeInTheDocument();
      expect(screen.queryByText(/borrosa/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/más luz/i)).not.toBeInTheDocument();
    });

    it("reports a connection problem on any other failure", async () => {
      identifyReturns(500);
      render(<AddBookByPhoto />);
      capturePhoto();

      await screen.findByText(/No pudimos procesar la foto/);
      expect(screen.getByText(/problema de conexión/i)).toBeInTheDocument();
    });
  });

  it("says the book wasn't recognized when the AI returns no candidate", async () => {
    // This is the one case where the photo really is the likely culprit, so it
    // is the only place that should suggest retaking it.
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/shelves")) return jsonResponse([]);
      if (url.endsWith("/api/ai/identify"))
        return jsonResponse({
          aiConfidence: null,
          sourceProvider: "gemini",
          best: null,
          alternatives: [],
        });
      return jsonResponse({});
    }) as unknown as typeof fetch;

    render(<AddBookByPhoto />);
    capturePhoto();

    expect(
      await screen.findByText(/No reconocimos el libro/, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
