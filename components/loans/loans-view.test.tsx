import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoansView } from "./loans-view";
import type { Loan } from "@/lib/types/loan";

/**
 * Component tests for `/prestamos` (#39): grouping open loans by borrower,
 * flagging an overdue one, the empty state, history, and returning a loan.
 */

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

function loan(o: Partial<Loan>): Loan {
  return {
    id: "l1",
    copyId: "c1",
    borrowerName: "Juan Pérez",
    borrowerKey: "juan-perez",
    loanedAt: "2026-07-01",
    dueDate: null,
    returnedAt: null,
    notes: null,
    bookId: "b1",
    bookTitle: "El nombre del viento",
    bookAuthors: ["Patrick Rothfuss"],
    coverUrl: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...o,
  };
}

function mockLoans(loans: Loan[]) {
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/loans") && method === "GET")
      return jsonResponse(loans);
    if (url.includes("/return")) {
      const body = JSON.parse(String(init?.body)) as { returnedAt: string };
      const id = url.split("/").at(-2);
      const found = loans.find((l) => l.id === id)!;
      return jsonResponse({ ...found, returnedAt: body.returnedAt });
    }
    return jsonResponse({}, false);
  }) as unknown as typeof fetch;
}

beforeEach(() => vi.clearAllMocks());

describe("LoansView · Afuera", () => {
  it("groups open loans by borrower and flags an overdue one", async () => {
    mockLoans([
      loan({ id: "l1", borrowerName: "Juan Pérez", borrowerKey: "juan-perez" }),
      loan({
        id: "l2",
        borrowerName: "Malena Ruiz",
        borrowerKey: "malena-ruiz",
        bookTitle: "Kentukis",
        dueDate: "2000-01-01", // long past → overdue
      }),
    ]);

    render(<LoansView />);
    expect(await screen.findByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Malena Ruiz")).toBeInTheDocument();
    expect(screen.getByText("El nombre del viento")).toBeInTheDocument();
    expect(screen.getByText("Kentukis")).toBeInTheDocument();
    // Only Malena's group is flagged overdue.
    expect(screen.getAllByText("Vencido")).toHaveLength(1);
  });

  it("shows the empty state when nothing is out", async () => {
    mockLoans([]);
    render(<LoansView />);
    expect(await screen.findByText("Nada prestado")).toBeInTheDocument();
  });

  it("returning a loan removes it from Afuera", async () => {
    mockLoans([loan({})]);
    render(<LoansView />);
    fireEvent.click(
      await screen.findByRole("button", { name: /como devuelto/ }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("El nombre del viento"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Nada prestado")).toBeInTheDocument();
  });
});

describe("LoansView · Historial", () => {
  it("lists closed loans on the Historial tab", async () => {
    mockLoans([
      loan({ id: "l1" }),
      loan({
        id: "l2",
        bookTitle: "Cien años de soledad",
        returnedAt: "2026-06-01T00:00:00.000Z",
      }),
    ]);
    render(<LoansView />);
    await screen.findByText("El nombre del viento");
    fireEvent.click(screen.getByRole("tab", { name: /Historial/ }));
    expect(await screen.findByText("Cien años de soledad")).toBeInTheDocument();
    expect(screen.getByText("Devuelto")).toBeInTheDocument();
    // The still-open loan doesn't show up in history.
    expect(screen.queryByText("El nombre del viento")).not.toBeInTheDocument();
  });
});
