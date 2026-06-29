import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportSummary } from "./import-summary-view";
import type { ImportOutcome } from "./import-summary";

/**
 * Component test for the import summary (#22). `fetch` is mocked so undo (copy +
 * book DELETE) and retry (re-intake) run in jsdom. The list is controlled, so we
 * re-render with whatever `onChange` produces to reflect the new state.
 */

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

let calls: Array<{ url: string; method: string }>;

beforeEach(() => {
  calls = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" });
    if (String(input).endsWith("/api/books/intake"))
      return json({ book: { id: "bNew" }, copy: { id: "cNew" } }, 201);
    return json({});
  }) as unknown as typeof fetch;
});

const mixed: ImportOutcome[] = [
  { title: "Dune", result: "added", bookId: "b1", copyId: "c1" },
  { title: "1984", result: "added_as_copy", copyId: "c2" },
  { title: "Old", result: "skipped_duplicate" },
  { title: "Meh", result: "discarded" },
  {
    title: "Oops",
    result: "failed",
    retry: { payload: { book: { title: "Oops" } } },
  },
];

/** Render with a controlled list, returning a helper to read the latest state. */
function renderControlled(initial: ImportOutcome[]) {
  let current = initial;
  const onChange = vi.fn((next: ImportOutcome[]) => {
    current = next;
    rerender(<ImportSummary outcomes={current} onChange={onChange} />);
  });
  const { rerender } = render(
    <ImportSummary outcomes={current} onChange={onChange} />,
  );
  return { onChange, get: () => current };
}

describe("ImportSummary", () => {
  it("renders groups and counts from a mixed outcome list", () => {
    renderControlled(mixed);
    expect(screen.getByText("2 de 5 agregados")).toBeInTheDocument();
    // the 4 non-empty groups (added, added_as_copy, failed, skipped, discarded)
    // each surface a "· N" count header
    expect(screen.getAllByText(/·\s*\d+/).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });

  it("undo of an added book deletes the copy then the book", async () => {
    const { get } = renderControlled(mixed);
    fireEvent.click(screen.getByRole("button", { name: /Deshacer Dune/ }));
    await waitFor(() =>
      expect(get()[0]).toMatchObject({ result: "discarded" }),
    );
    expect(calls).toEqual([
      { url: "/api/copies/c1", method: "DELETE" },
      { url: "/api/books/b1", method: "DELETE" },
    ]);
  });

  it("undo of a copy deletes only the copy", async () => {
    const { get } = renderControlled(mixed);
    fireEvent.click(screen.getByRole("button", { name: /Deshacer 1984/ }));
    await waitFor(() =>
      expect(get()[1]).toMatchObject({ result: "discarded" }),
    );
    expect(calls).toEqual([{ url: "/api/copies/c2", method: "DELETE" }]);
  });

  it("retry of a failed item re-intakes and moves it to added", async () => {
    const { get } = renderControlled(mixed);
    fireEvent.click(screen.getByRole("button", { name: /Reintentar Oops/ }));
    await waitFor(() =>
      expect(get()[4]).toMatchObject({
        result: "added",
        bookId: "bNew",
        copyId: "cNew",
      }),
    );
    expect(calls.some((c) => c.url.endsWith("/api/books/intake"))).toBe(true);
  });
});
