import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ImportSummaryPage from "./page";
import { saveImport } from "@/components/books/import-summary";

/**
 * Route test for the AI import summary (#22). `useAuth` and `fetch` are mocked;
 * the page hydrates its outcome list from `sessionStorage` and renders either the
 * grouped summary or the "nothing to show" empty state.
 */

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));
});

describe("ImportSummaryPage", () => {
  it("hydrates the summary from sessionStorage", async () => {
    saveImport([
      { title: "Dune", result: "added", bookId: "b1", copyId: "c1" },
    ]);
    render(<ImportSummaryPage />);
    expect(await screen.findByText("1 de 1 agregado")).toBeInTheDocument();
    expect(screen.getByText("Dune")).toBeInTheDocument();
  });

  it("shows the empty state when there is nothing to show", async () => {
    render(<ImportSummaryPage />);
    expect(await screen.findByText("Nada que mostrar")).toBeInTheDocument();
  });
});
