import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FactoryResetDialog } from "./factory-reset-dialog";

function json(body: unknown, ok = true, status = ok ? 200 : 500) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

/**
 * Library the dialog reads on open: 2 books, 1 copy, 1 loan — plus a reader,
 * which must never be deleted or counted.
 */
function mockLibrary(onDelete?: (url: string) => Response | null) {
  const deleted: string[] = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "GET") {
      if (url === "/api/books")
        return json([
          { id: "b1", title: "Rayuela" },
          { id: "b2", title: "Seda" },
        ]);
      if (url === "/api/copies") return json([{ id: "c1", bookId: "b1" }]);
      if (url === "/api/loans") return json([{ id: "l1", copyId: "c1" }]);
      if (url === "/api/readers")
        return json([{ id: "r1", name: "Frank", email: "f@example.com" }]);
      return json([]);
    }
    if (method === "DELETE") {
      const override = onDelete?.(url);
      if (override) return Promise.resolve(override);
      deleted.push(url);
      return json({}, true, 204);
    }
    return json({}, false);
  }) as unknown as typeof fetch;
  return deleted;
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: /Vaciar biblioteca/ }));
}

function confirm() {
  fireEvent.click(screen.getByRole("button", { name: /^Borrar todo$/ }));
}

describe("FactoryResetDialog", () => {
  it("shows the real counts of what will be deleted, and never lists readers", async () => {
    mockLibrary();
    render(<FactoryResetDialog />);
    open();

    await screen.findByText("Se va a borrar");
    const panel = screen.getByRole("alert");
    expect(panel).toHaveTextContent("Libros");
    expect(panel).toHaveTextContent("2");
    expect(panel).toHaveTextContent("Ejemplares");
    expect(panel).toHaveTextContent("Préstamos");
    // Readers are the access allowlist — they must never be offered for deletion.
    expect(panel).not.toHaveTextContent("Lectores");
  });

  it("deletes nothing until the reader confirms", async () => {
    const deleted = mockLibrary();
    render(<FactoryResetDialog />);
    open();

    await screen.findByText("Se va a borrar");
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

    await waitFor(() => expect(deleted).toHaveLength(0));
  });

  it("actually issues DELETEs on confirm, in reverse dependency order", async () => {
    // Asserting the requests — not just the success copy — is the point: the
    // restore cleanup bug in #93 shipped precisely because its test checked
    // the summary text while no DELETE ever fired.
    const deleted = mockLibrary();
    render(<FactoryResetDialog />);
    open();
    await screen.findByText("Se va a borrar");
    confirm();

    await screen.findByText(/Biblioteca vaciada/);
    expect(deleted).toEqual([
      "/api/loans/l1",
      "/api/copies/c1",
      "/api/books/b1",
      "/api/books/b2",
    ]);
    // A reader endpoint must never be among them.
    expect(deleted.some((url) => url.includes("/readers/"))).toBe(false);
  });

  it("surfaces a retry when a deletion fails", async () => {
    mockLibrary((url) =>
      url === "/api/books/b2"
        ? ({ ok: false, status: 500, json: async () => ({}) } as Response)
        : null,
    );
    render(<FactoryResetDialog />);
    open();
    await screen.findByText("Se va a borrar");
    confirm();

    await screen.findByText(/Quedaron cosas sin borrar/);
    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).toBeInTheDocument();
  });

  it("reports an already-empty library instead of asking for confirmation", async () => {
    global.fetch = vi.fn(() => json([])) as unknown as typeof fetch;
    render(<FactoryResetDialog />);
    open();

    await screen.findByText(/ya está vacía/);
    expect(
      screen.queryByRole("button", { name: /^Borrar todo$/ }),
    ).not.toBeInTheDocument();
  });
});
