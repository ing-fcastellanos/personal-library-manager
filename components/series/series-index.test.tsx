import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeriesIndex } from "./series-index";

/**
 * Component tests for `/ajustes/series` (#38): completion per series and the
 * empty state when none exist.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => vi.clearAllMocks());

describe("SeriesIndex", () => {
  it("shows completion per series", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse([
        {
          id: "s1",
          name: "El Señor de los Anillos",
          volumes: [
            { position: 1, title: "A", authors: [], bookId: "b1" },
            { position: 2, title: "B", authors: [], bookId: "b2" },
            { position: 3, title: "C", authors: [], bookId: null },
          ],
          createdAt: "",
          updatedAt: "",
        },
      ]),
    ) as unknown as typeof fetch;

    render(<SeriesIndex />);
    expect(
      await screen.findByText("El Señor de los Anillos"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 de 3 tomos")).toBeInTheDocument();
  });

  it("shows a complete series without an owned/total split", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse([
        {
          id: "s1",
          name: "Serie completa",
          volumes: [{ position: 1, title: "A", authors: [], bookId: "b1" }],
          createdAt: "",
          updatedAt: "",
        },
      ]),
    ) as unknown as typeof fetch;

    render(<SeriesIndex />);
    expect(await screen.findByText("Completa · 1 tomo")).toBeInTheDocument();
  });

  it("shows the empty state when no series exist", async () => {
    global.fetch = vi.fn(() => jsonResponse([])) as unknown as typeof fetch;

    render(<SeriesIndex />);
    expect(
      await screen.findByText("Todavía no armaste ninguna serie"),
    ).toBeInTheDocument();
  });
});
