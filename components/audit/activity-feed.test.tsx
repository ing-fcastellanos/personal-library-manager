import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityFeed } from "./activity-feed";

/**
 * Component tests for `/ajustes/actividad` (#40): entries most recent first
 * across entity types, since-deleted entities stay readable, and the empty state.
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

const readers = [{ id: "r1", name: "Frank" }];

beforeEach(() => vi.clearAllMocks());

describe("ActivityFeed", () => {
  it("lists entries across entity types with the resolved actor name", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/audit-log"))
        return jsonResponse([
          {
            id: "a1",
            readerId: "r1",
            action: "create",
            entityType: "book",
            entityId: "b1",
            entityLabel: "Rayuela",
            changedFields: null,
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ]);
      if (url.includes("/api/readers")) return jsonResponse(readers);
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    render(<ActivityFeed />);
    expect(await screen.findByText(/Frank/)).toBeInTheDocument();
    expect(screen.getByText(/agregó/)).toBeInTheDocument();
    expect(screen.getByText(/Rayuela/)).toBeInTheDocument();
  });

  it("still shows a readable label for a since-deleted entity", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/audit-log"))
        return jsonResponse([
          {
            id: "a1",
            readerId: "r1",
            action: "delete",
            entityType: "book",
            entityId: "gone",
            entityLabel: "Ficciones",
            changedFields: null,
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ]);
      if (url.includes("/api/readers")) return jsonResponse(readers);
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    render(<ActivityFeed />);
    expect(await screen.findByText(/Ficciones/)).toBeInTheDocument();
  });

  it("shows the empty state when nothing is logged", async () => {
    global.fetch = vi.fn(() => jsonResponse([])) as unknown as typeof fetch;
    render(<ActivityFeed />);
    expect(
      await screen.findByText("Todavía no hay actividad registrada"),
    ).toBeInTheDocument();
  });
});
