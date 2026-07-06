import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmReadingSheet } from "./confirm-reading-sheet";
import { todayIso } from "./mark-read";

/**
 * Component tests for the shared mark-as-read confirmation (#24). `fetch`, toast
 * and the sign-in CTA are mocked so the confirm → POST flow runs in jsdom.
 */

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/auth/write-cta", () => ({
  WriteCta: () => <button type="button">Iniciar sesión</button>,
}));

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const reader = {
  id: "r1",
  name: "Frank",
  preferences: {},
  createdAt: "",
  updatedAt: "",
};
const target = {
  id: "b1",
  title: "Dune",
  authors: ["Frank Herbert"],
  coverUrl: null,
  isbn13: "9780307474728",
};

let posts: Array<{ body: Record<string, unknown> }>;
let copies: unknown[];
let postStatus: number;

beforeEach(() => {
  posts = [];
  copies = [];
  postStatus = 201;
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/copies")) return json(copies);
    if (url.endsWith("/api/reading-events") && method === "POST") {
      const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
      posts.push({ body });
      return json({ id: "e1", ...body, bookTitle: "Dune" }, postStatus);
    }
    return json({});
  }) as unknown as typeof fetch;
});

const noop = () => {};

describe("ConfirmReadingSheet", () => {
  it("defaults the finish date to today", async () => {
    render(
      <ConfirmReadingSheet
        target={target}
        reader={reader}
        onDone={noop}
        onClose={noop}
      />,
    );
    const input = await screen.findByLabelText("Fecha de fin");
    expect(input).toHaveValue(todayIso());
  });

  it("includes the selected copy in the create request", async () => {
    copies = [
      { id: "cp1", bookId: "b1", shelfId: null },
      { id: "cp2", bookId: "b1", shelfId: "s1" },
    ];
    render(
      <ConfirmReadingSheet
        target={target}
        reader={reader}
        onDone={noop}
        onClose={noop}
      />,
    );
    fireEvent.change(await screen.findByLabelText("Ejemplar"), {
      target: { value: "cp2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Marcar como leído/ }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].body).toMatchObject({
      readerId: "r1",
      bookId: "b1",
      status: "finished",
      copyId: "cp2",
      dateFinished: todayIso(),
    });
  });

  it("creates with null copyId when the book has no copies", async () => {
    copies = [];
    render(
      <ConfirmReadingSheet
        target={target}
        reader={reader}
        onDone={noop}
        onClose={noop}
      />,
    );
    // No copy selector appears when there are no copies.
    await screen.findByLabelText("Fecha de fin");
    expect(screen.queryByLabelText("Ejemplar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Marcar como leído/ }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].body.copyId).toBeNull();
    expect(posts[0].body.status).toBe("finished");
  });

  it("calls onDone with the created event on success", async () => {
    const onDone = vi.fn();
    render(
      <ConfirmReadingSheet
        target={target}
        reader={reader}
        onDone={onDone}
        onClose={noop}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Marcar como leído/ }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onDone.mock.calls[0][0]).toMatchObject({
      id: "e1",
      status: "finished",
    });
  });

  it("keeps the sheet open with an error when the create fails", async () => {
    postStatus = 500;
    render(
      <ConfirmReadingSheet
        target={target}
        reader={reader}
        onDone={noop}
        onClose={noop}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Marcar como leído/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /No se pudo registrar/,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("prompts to sign in when there is no active reader", () => {
    render(
      <ConfirmReadingSheet
        target={target}
        reader={null}
        onDone={noop}
        onClose={noop}
      />,
    );
    expect(
      screen.getByText(/Iniciá sesión para registrar la lectura/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Fecha de fin")).not.toBeInTheDocument();
  });
});
