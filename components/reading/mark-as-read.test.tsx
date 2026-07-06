import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MarkAsRead } from "./mark-as-read";

/**
 * Component tests for the dedicated mark-as-read flow (#24): find a library book
 * by search or photo, then confirm. Auth, toast, links, and the image prep are
 * mocked so the flow runs in jsdom.
 */

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Frank" }, loading: false }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/auth/write-cta", () => ({
  WriteCta: () => <button type="button">Iniciar sesión</button>,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/books/photo-add", () => ({
  prepareImage: async () => ({ base64: "x", contentType: "image/jpeg" }),
}));

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const DUNE = "9780307474728";
const book = {
  id: "b1",
  title: "Dune",
  authors: ["Frank Herbert"],
  coverUrl: null,
  isbn13: DUNE,
};

let searchItems: unknown[];
let identifyBest: unknown;
let dupMatches: unknown[];
let posts: Array<{ body: Record<string, unknown> }>;

beforeEach(() => {
  searchItems = [book];
  identifyBest = { title: "Dune", authors: ["Frank Herbert"], isbn13: DUNE };
  dupMatches = [];
  posts = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.includes("/api/catalog/search"))
      return json({ items: searchItems });
    if (url.endsWith("/copies")) return json([]);
    if (url.includes("/api/ai/identify"))
      return json({ best: identifyBest, alternatives: [] });
    if (url.includes("/api/books/duplicates"))
      return json({ matches: dupMatches });
    if (url.endsWith("/api/reading-events") && method === "POST") {
      const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
      posts.push({ body });
      return json({ id: "e1", ...body, bookTitle: "Dune", bookId: "b1" }, 201);
    }
    return json({});
  }) as unknown as typeof fetch;
});

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("MarkAsRead", () => {
  it("search → select → confirm → creates the reading event", async () => {
    render(<MarkAsRead />);
    fireEvent.change(screen.getByLabelText("Buscar en el catálogo"), {
      target: { value: "dune" },
    });
    fireEvent.click(await screen.findByText("Dune"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Marcar como leído/ }),
    );
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].body).toMatchObject({ bookId: "b1", status: "finished" });
    expect(await screen.findByText(/Lectura registrada/)).toBeInTheDocument();
  });

  it("photo identify that matches a library book opens the confirm", async () => {
    dupMatches = [
      {
        book: { id: "b1", title: "Dune", authors: ["Frank Herbert"] },
        existingCopies: 1,
      },
    ];
    render(<MarkAsRead />);
    fireEvent.click(screen.getByRole("radio", { name: "Por foto" }));
    fireEvent.change(fileInput(), {
      target: { files: [new File(["x"], "p.jpg", { type: "image/jpeg" })] },
    });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Dune")).toBeInTheDocument();
  });

  it("photo identify not in the library offers to add it first", async () => {
    dupMatches = []; // no library match
    render(<MarkAsRead />);
    fireEvent.click(screen.getByRole("radio", { name: "Por foto" }));
    fireEvent.change(fileInput(), {
      target: { files: [new File(["x"], "p.jpg", { type: "image/jpeg" })] },
    });
    expect(
      await screen.findByText(/No está en tu biblioteca/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Agregar libro/ })).toHaveAttribute(
      "href",
      "/agregar",
    );
  });
});
