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
});
