import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShelvesManager } from "./shelves-manager";

/**
 * Component tests for the shelves manager (#18). `fetch` and `next/link` are
 * mocked so list+counts, create, and delete-with-warning run in jsdom.
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
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const shelves = [
  { id: "s1", name: "Living", location: "Pared norte", description: null },
  { id: "s2", name: "Estudio", location: null, description: null },
];

beforeEach(() => {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/shelves")) return jsonResponse(shelves);
    if (url.startsWith("/api/catalog/search"))
      return jsonResponse({ facets: { shelves: [{ value: "s1", count: 3 }] } });
    return jsonResponse({}, 200);
  }) as unknown as typeof fetch;
});

describe("ShelvesManager", () => {
  it("lists shelves with book counts and a content link", async () => {
    render(<ShelvesManager />);
    expect(await screen.findByText("Living")).toBeInTheDocument();
    expect(screen.getByText("3 libros")).toBeInTheDocument(); // s1 facet count
    expect(screen.getByText("0 libros")).toBeInTheDocument(); // s2 no facet → 0
    const link = screen.getAllByRole("link", { name: "Ver contenido" })[0];
    expect(link).toHaveAttribute("href", "/catalogo?shelf=s1");
  });

  it("warns about affected books when deleting a non-empty shelf", async () => {
    render(<ShelvesManager />);
    await screen.findByText("Living");
    // First shelf (Living, 3 books) delete button.
    fireEvent.click(
      screen.getAllByRole("button", { name: "Borrar estante" })[0],
    );
    expect(await screen.findByText(/quedarán sin estante/)).toBeInTheDocument();
  });

  it("opens the create dialog", async () => {
    render(<ShelvesManager />);
    await screen.findByText("Living");
    fireEvent.click(screen.getByRole("button", { name: /Agregar estante/ }));
    expect(await screen.findByText("Nuevo estante")).toBeInTheDocument();
  });

  it("opens the QR dialog for the right shelf", async () => {
    render(<ShelvesManager />);
    await screen.findByText("Living");
    // Second shelf (Estudio) "Ver QR" button.
    fireEvent.click(screen.getAllByRole("button", { name: "Ver QR" })[1]);
    expect(
      await screen.findByRole("heading", { name: "Estudio" }),
    ).toBeInTheDocument();
  });
});
