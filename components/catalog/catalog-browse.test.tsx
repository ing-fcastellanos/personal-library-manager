import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CatalogBrowse } from "./catalog-browse";

/**
 * Component tests for the catalog browse scaffold (#17). `fetch`, `useAuth`, and
 * `next/link` are mocked so search → results → no-results and navigation run in
 * jsdom.
 */

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));
const shelfMock = vi.hoisted(() => ({ value: null as string | null }));
vi.mock("@/components/shelf/shelf-context", () => ({
  useShelf: () => ({ shelf: shelfMock.value }),
}));
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

const emptyFacets = {
  categories: [],
  authors: [],
  publishers: [],
  shelves: [],
};
const book = {
  id: "b1",
  title: "El nombre del viento",
  authors: ["Patrick Rothfuss"],
  publishedYear: 2007,
  categories: [],
  coverUrl: null,
};

let lastUrl = "";
let total = 1;

beforeEach(() => {
  total = 1;
  lastUrl = "";
  shelfMock.value = null;
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    lastUrl = String(input);
    return jsonResponse({
      items: total > 0 ? [book] : [],
      total,
      page: 1,
      facets: {
        ...emptyFacets,
        shelves: [{ value: "s1", label: "Living", count: 1 }],
      },
    });
  }) as unknown as typeof fetch;
});

describe("CatalogBrowse", () => {
  it("renders results from the search endpoint", async () => {
    render(<CatalogBrowse />);
    const link = await screen.findByRole("link", {
      name: /El nombre del viento/,
    });
    expect(link).toHaveAttribute("href", "/libros/b1");
  });

  it("preselects the shelf carried from a QR scan (#18)", async () => {
    shelfMock.value = "s1";
    render(<CatalogBrowse />);
    await waitFor(() => expect(lastUrl).toContain("shelf=s1"));
  });

  it("sends the query to the endpoint when typing", async () => {
    render(<CatalogBrowse />);
    await screen.findByRole("link", { name: /El nombre del viento/ });
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "viento" },
    });
    await waitFor(() => expect(lastUrl).toContain("q=viento"));
  });

  it("shows a no-results state when a filter matches nothing", async () => {
    total = 0;
    render(<CatalogBrowse />);
    // With an active query and zero matches it's the no-results state (not empty).
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "zzz" },
    });
    expect(await screen.findByText("Sin coincidencias")).toBeInTheDocument();
  });

  it("toggles to the list view", async () => {
    render(<CatalogBrowse />);
    await screen.findByRole("link", { name: /El nombre del viento/ });
    fireEvent.click(screen.getByRole("button", { name: "Vista lista" }));
    expect(
      screen.getByRole("link", { name: /El nombre del viento/ }),
    ).toBeInTheDocument();
  });
});
