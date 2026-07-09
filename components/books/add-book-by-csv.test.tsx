import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddBookByCsv } from "./add-book-by-csv";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const CSV = [
  "Title,Author,ISBN13,My Rating,My Review,Date Read,Exclusive Shelf",
  'Rayuela,Julio Cortázar,="9780307474728",4,Great,2026/06/01,read',
  'Ficciones,Jorge Luis Borges,="9788499089946",0,,,to-read',
].join("\n");

function csvFile() {
  return new File([CSV], "goodreads_export.csv", { type: "text/csv" });
}

describe("AddBookByCsv", () => {
  it("walks upload → mapping → review → confirm → summary", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/enrich")) return json({ candidate: null });
      if (url.startsWith("/api/books/duplicates"))
        return json({ recommendation: "add-new", matches: [] });
      if (url === "/api/books/intake")
        return json({ book: { id: "b1" }, copy: { id: "c1" } });
      if (url === "/api/reading-events") return json({ id: "e1" });
      return json({}, false);
    }) as unknown as typeof fetch;

    render(<AddBookByCsv />);

    // Upload step.
    expect(
      screen.getByText(/Importá tu CSV de Goodreads o StoryGraph/),
    ).toBeInTheDocument();
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile()] } });

    // Mapping step — Goodreads is auto-detected, defaults pre-filled.
    await screen.findByRole("button", { name: "Continuar" });
    expect(screen.getByLabelText("Título")).toHaveValue("Title");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Review step — only the "read" row survives the finished-only filter.
    await screen.findByText("Rayuela");
    expect(screen.queryByText("Ficciones")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Importar 1 lectura/ }));

    // Summary — the AI-flow summary screen is reused as-is.
    await waitFor(() =>
      expect(screen.getByText(/1 de 1 agregado/)).toBeInTheDocument(),
    );
  });

  it("shows an empty message when no rows are finished", async () => {
    global.fetch = vi.fn(() => json({}, false)) as unknown as typeof fetch;
    render(<AddBookByCsv />);

    const noFinishedCsv = new File(
      [
        "Title,Author,ISBN13,My Rating,My Review,Date Read,Exclusive Shelf\nFicciones,Jorge Luis Borges,,0,,,to-read\n",
      ],
      "export.csv",
      { type: "text/csv" },
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [noFinishedCsv] } });

    await screen.findByRole("button", { name: "Continuar" });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByText(/No encontramos lecturas terminadas para importar/);
  });
});
