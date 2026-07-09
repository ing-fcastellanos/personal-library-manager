import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingEventCard } from "./reading-event-card";
import type { ReadingEvent } from "@/lib/types/reading-event";

/** Component tests for the shared reading-event card (#26). */

const event: ReadingEvent = {
  id: "e1",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: "2026-07-06",
  rating: 4,
  review: "Bestial el ritmo.",
  publishPending: false,
  bookTitle: "Rayuela",
  bookAuthors: ["Julio Cortázar"],
  isbn13: null,
  coverUrl: null,
  createdAt: "2026-07-06T00:00:00Z",
  updatedAt: "",
};

describe("ReadingEventCard", () => {
  it("shows the book snapshot, reader, rating and review", () => {
    render(<ReadingEventCard event={event} readerName="Sofía" />);
    expect(screen.getByText("Rayuela")).toBeInTheDocument();
    expect(screen.getByText("Julio Cortázar")).toBeInTheDocument();
    expect(screen.getByText(/Sofía/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "4 de 5 estrellas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bestial el ritmo.")).toBeInTheDocument();
  });

  it("shows the edit control only when editable", () => {
    const onEdit = vi.fn();
    const { rerender } = render(
      <ReadingEventCard event={event} readerName="Sofía" />,
    );
    expect(
      screen.queryByRole("button", { name: /Editar/ }),
    ).not.toBeInTheDocument();

    rerender(
      <ReadingEventCard
        event={event}
        readerName="Sofía"
        editable
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("hides the book title in reader-centric (per-book) mode", () => {
    render(
      <ReadingEventCard event={event} readerName="Sofía" showBook={false} />,
    );
    expect(screen.queryByText("Rayuela")).not.toBeInTheDocument();
    expect(screen.getByText("Sofía")).toBeInTheDocument();
  });

  it("shows the pending-to-publish toggle and Goodreads link only when editable (#34)", () => {
    const { rerender } = render(
      <ReadingEventCard
        event={event}
        readerName="Sofía"
        goodreadsUrl="https://www.goodreads.com/user/show/1"
      />,
    );
    expect(screen.queryByText("Pendiente de publicar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Publicar en Goodreads" }),
    ).not.toBeInTheDocument();

    rerender(
      <ReadingEventCard
        event={event}
        readerName="Sofía"
        editable
        goodreadsUrl="https://www.goodreads.com/user/show/1"
        onTogglePublishPending={vi.fn()}
      />,
    );
    expect(screen.getByText("Pendiente de publicar")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Publicar en Goodreads" });
    expect(link).toHaveAttribute(
      "href",
      "https://www.goodreads.com/search?q=Rayuela",
    );
  });

  it("hides the Goodreads link when the active reader has no goodreadsUrl", () => {
    render(<ReadingEventCard event={event} readerName="Sofía" editable />);
    expect(
      screen.queryByRole("link", { name: "Publicar en Goodreads" }),
    ).not.toBeInTheDocument();
  });

  it("toggling the checkbox calls onTogglePublishPending with the new value", () => {
    const onToggle = vi.fn();
    render(
      <ReadingEventCard
        event={event}
        readerName="Sofía"
        editable
        onTogglePublishPending={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("prefers the ISBN over the title in the Goodreads link when present", () => {
    render(
      <ReadingEventCard
        event={{ ...event, isbn13: "9788437604572" }}
        readerName="Sofía"
        editable
        goodreadsUrl="https://www.goodreads.com/user/show/1"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Publicar en Goodreads" }),
    ).toHaveAttribute(
      "href",
      "https://www.goodreads.com/search?q=9788437604572",
    );
  });
});
