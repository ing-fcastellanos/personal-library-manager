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

let calls: Array<{ url: string; method: string }>;

beforeEach(() => {
  calls = [];
  push.mockReset();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
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
});
