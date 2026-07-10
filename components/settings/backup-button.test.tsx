import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BackupButton } from "./backup-button";

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

let createdBlobs: Blob[];

beforeEach(() => {
  createdBlobs = [];
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/books") return json([{ id: "b1", title: "Rayuela" }]);
    if (url === "/api/readers")
      return json([{ id: "r1", name: "Sofía", hasPin: true }]);
    return json([]);
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

describe("BackupButton", () => {
  it("downloads a JSON blob containing every collection", async () => {
    render(<BackupButton />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar backup/ }));

    await waitFor(() => expect(createdBlobs).toHaveLength(1));
    const text = await blobText(createdBlobs[0]);
    const parsed = JSON.parse(text);
    expect(parsed.books).toEqual([{ id: "b1", title: "Rayuela" }]);
    expect(parsed.readers[0]).not.toHaveProperty("pinHash");
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("disables the button and sets aria-busy while downloading", async () => {
    let resolveBooks!: (value: Response) => void;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/books") {
        return new Promise<Response>((resolve) => {
          resolveBooks = resolve;
        });
      }
      return json([]);
    }) as unknown as typeof fetch;

    render(<BackupButton />);
    const button = screen.getByRole("button", { name: /Descargar backup/ });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute("aria-busy", "true");

    resolveBooks(await json([]));
  });

  it("names the file backup-biblioteca-<date>.json", async () => {
    render(<BackupButton />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar backup/ }));

    await waitFor(() =>
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled(),
    );
    const clickMock = vi.mocked(HTMLAnchorElement.prototype.click);
    const anchor = clickMock.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(
      /^backup-biblioteca-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });
});
