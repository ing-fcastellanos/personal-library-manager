import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RestoreDialog } from "./restore-dialog";

function json(body: unknown, ok = true, status = ok ? 200 : 500) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function backupFile(content: unknown) {
  return new File([JSON.stringify(content)], "backup.json", {
    type: "application/json",
  });
}

const validBackup = {
  exportedAt: "t",
  books: [{ id: "b1", title: "Rayuela", createdAt: "t", updatedAt: "t" }],
  copies: [],
  readingEvents: [],
  readers: [],
  shelves: [],
  wishlistItems: [],
  loans: [],
  series: [],
};

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /Restaurar backup/ }));
}

async function uploadFile(content: unknown) {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  await waitFor(() =>
    Object.defineProperty(input, "files", {
      value: [backupFile(content)],
    }),
  );
  fireEvent.change(input);
}

describe("RestoreDialog", () => {
  it("rejects a file that isn't a valid backup", async () => {
    render(<RestoreDialog />);
    openDialog();
    await uploadFile({ not: "a backup" });
    await screen.findByText(/no es un backup válido/);
  });

  it("walks upload → confirm → create → cleanup → summary on a fully successful restore", async () => {
    // The live library already has one book ("old-b1") before restoring —
    // this is what a real restore replaces, and what a regression here
    // (cleanup silently not firing on success) would leave behind.
    const deleted: string[] = [];
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url === "/api/books")
        return json([{ id: "old-b1", title: "Ya existía" }]);
      if (method === "GET") return json([]);
      if (method === "POST" && url === "/api/books")
        return json({ id: "new-b1" }, true, 201);
      if (method === "DELETE") {
        deleted.push(url);
        return json({}, true, 204);
      }
      return json({}, false);
    }) as unknown as typeof fetch;

    render(<RestoreDialog />);
    openDialog();
    await uploadFile(validBackup);

    await screen.findByText("Confirmar restauración");
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(screen.getByText("Restauración completa")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Creados/)).toBeInTheDocument();
    // The pre-existing book must actually be deleted once creation succeeds —
    // not just reported as such in the summary.
    expect(deleted).toContain("/api/books/old-b1");
  });

  it("shows the failed group and a retry action without deleting anything when creation fails", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET") return json([]);
      if (method === "POST" && url === "/api/books")
        return json({ error: "boom" }, false, 500);
      return json({}, false);
    }) as unknown as typeof fetch;

    render(<RestoreDialog />);
    openDialog();
    await uploadFile(validBackup);

    await screen.findByText("Confirmar restauración");
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(screen.getByText("Restauración con errores")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/No se borró nada de lo que tenías antes/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reintentar fallidos" }),
    ).toBeInTheDocument();
  });
});
