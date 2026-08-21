import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { EditBook } from "./edit-book";

/**
 * Component tests for the connected edit container (#15) wired to the design's
 * `EditBookForm`. `fetch` is mocked per-URL so load → edit → save, the re-enrich
 * diff, and remove-cover run in jsdom.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const book = {
  id: "b1",
  title: "El nombre del viento",
  authors: ["Patrick Rothfuss"],
  isbn13: "9780756404741",
  publisher: "DAW",
  publishedYear: 2007,
  categories: ["Fantasía"],
  language: "Español",
  coverUrl: "https://ext/cover.jpg",
  coverSource: "metadata",
};
const copies = [{ id: "c1", bookId: "b1", notes: "" }];
const candidate = { title: "El nombre del viento", publishedYear: 2099 };

const patchBook = vi.fn(() => jsonResponse({ ...book }));
const patchCopy = vi.fn(() => jsonResponse(copies[0]));

beforeEach(() => {
  patchBook.mockClear();
  patchCopy.mockClear();
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/books/b1") && method === "GET")
      return jsonResponse(book);
    if (url.endsWith("/api/books/b1/copies")) return jsonResponse(copies);
    if (url.endsWith("/api/shelves")) return jsonResponse([]);
    if (url.includes("/api/enrich")) return jsonResponse({ candidate });
    if (url.endsWith("/api/books/b1") && method === "PATCH") return patchBook();
    if (url.includes("/api/copies/") && method === "PATCH") return patchCopy();
    return jsonResponse({}, 404);
  }) as unknown as typeof fetch;
});

describe("EditBook", () => {
  it("loads the book into the form", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/Título/)).toHaveValue(
        "El nombre del viento",
      ),
    );
  });

  it("saves edits and shows the success state", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.change(screen.getByLabelText(/Título/), {
      target: { value: "Título corregido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(patchBook).toHaveBeenCalledOnce());
    expect(patchCopy).toHaveBeenCalledOnce();
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
  });

  it("opens the re-enrich diff dialog with the differing field", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(
      screen.getByRole("button", { name: /Re-enriquecer desde fuentes/ }),
    );
    expect(await screen.findByText(/campo distinto/)).toBeInTheDocument();
  });

  it("removes the cover", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Quitar" })).toBeNull(),
    );
  });
});

/**
 * A book's cover is either "user" (someone deliberately uploaded it — #15 D5,
 * preserved) or "ai-photo" (just how the add-by-photo flow captures the book —
 * #20, eligible for a re-enrich swap). These lock the distinction in.
 */
describe("EditBook — cover replacement (#20)", () => {
  const coverCandidate = {
    title: "El nombre del viento",
    coverUrl: "https://source/cover.jpg",
  };

  function mockFetchWithCoverSource(coverSource: "user" | "ai-photo") {
    const withSource = { ...book, coverSource };
    const patched: { body?: unknown } = {};
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1") && method === "GET")
        return jsonResponse(withSource);
      if (url.endsWith("/api/books/b1/copies")) return jsonResponse(copies);
      if (url.endsWith("/api/shelves")) return jsonResponse([]);
      if (url.includes("/api/enrich"))
        return jsonResponse({ candidate: coverCandidate });
      if (url.endsWith("/api/books/b1") && method === "PATCH") {
        patched.body = JSON.parse(String(init?.body));
        return jsonResponse({ ...withSource });
      }
      if (url.includes("/api/copies/") && method === "PATCH")
        return patchCopy();
      return jsonResponse({}, 404);
    }) as unknown as typeof fetch;
    return patched;
  }

  it("offers the cover diff for an ai-photo cover", async () => {
    mockFetchWithCoverSource("ai-photo");
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(
      screen.getByRole("button", { name: /Re-enriquecer desde fuentes/ }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Portada")).toBeInTheDocument();
  });

  it("does not offer the cover diff for a deliberately user-uploaded cover", async () => {
    mockFetchWithCoverSource("user");
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(
      screen.getByRole("button", { name: /Re-enriquecer desde fuentes/ }),
    );
    // `coverCandidate` only differs from `book` on cover, so with it blocked
    // there's nothing left to offer.
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/0 campos distintos/)).toBeInTheDocument();
    expect(within(dialog).queryByText("Portada")).not.toBeInTheDocument();
  });

  it("accepting a cover diff persists coverSource as metadata", async () => {
    const patched = mockFetchWithCoverSource("ai-photo");
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    fireEvent.click(
      screen.getByRole("button", { name: /Re-enriquecer desde fuentes/ }),
    );
    const dialog = await screen.findByRole("dialog");
    within(dialog).getByText("Portada");
    fireEvent.click(screen.getByRole("radio", { name: /De la fuente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Aplicar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(
        (patched.body as { coverSource?: string; coverUrl?: string })
          ?.coverSource,
      ).toBe("metadata"),
    );
    expect((patched.body as { coverUrl?: string })?.coverUrl).toBe(
      "https://source/cover.jpg",
    );
  });
});

describe("EditBook — stock cover from provider", () => {
  it("offers three ways to change the cover", async () => {
    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    // Radix's DropdownMenuTrigger opens on pointerdown, not click.
    fireEvent.pointerDown(screen.getByRole("button", { name: /Cambiar/ }), {
      button: 0,
    });
    expect(
      await screen.findByRole("menuitem", { name: "Tomar foto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Elegir de la galería" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Usar portada de Google" }),
    ).toBeInTheDocument();
  });

  it("fetches the provider's stock cover and persists coverSource as metadata", async () => {
    const patched: { body?: unknown } = {};
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/books/b1") && method === "GET")
        return jsonResponse(book);
      if (url.endsWith("/api/books/b1/copies")) return jsonResponse(copies);
      if (url.endsWith("/api/shelves")) return jsonResponse([]);
      if (url.includes("/api/enrich")) return jsonResponse({ candidate });
      if (url.endsWith("/api/books/b1/cover/from-source") && method === "POST")
        return jsonResponse({ coverUrl: "https://storage/covers/stock.webp" });
      if (url.endsWith("/api/books/b1") && method === "PATCH") {
        patched.body = JSON.parse(String(init?.body));
        return jsonResponse({ ...book });
      }
      if (url.includes("/api/copies/") && method === "PATCH")
        return patchCopy();
      return jsonResponse({}, 404);
    }) as unknown as typeof fetch;

    render(<EditBook bookId="b1" />);
    await waitFor(() => screen.getByLabelText(/Título/));
    // Radix's DropdownMenuTrigger opens on pointerdown, not click.
    fireEvent.pointerDown(screen.getByRole("button", { name: /Cambiar/ }), {
      button: 0,
    });
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Usar portada de Google" }),
    );
    await waitFor(() =>
      expect(screen.getByAltText(/Portada de/)).toHaveAttribute(
        "src",
        "https://storage/covers/stock.webp",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect((patched.body as { coverSource?: string })?.coverSource).toBe(
        "metadata",
      ),
    );
  });
});
