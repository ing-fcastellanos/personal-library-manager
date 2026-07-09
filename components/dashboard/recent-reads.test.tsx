import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentReads } from "./recent-reads";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/** Component tests for the "Últimos leídos" widget (#29). */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const mk = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: "2026-07-06",
  rating: null,
  review: null,
  publishPending: false,
  bookTitle: "T",
  bookAuthors: [],
  isbn13: null,
  coverUrl: null,
  createdAt: "2026-07-06T00:00:00Z",
  updatedAt: "",
  ...p,
});

const mkReader = (p: Partial<Reader>): Reader => ({
  id: "r",
  name: "R",
  preferences: {},
  createdAt: "",
  updatedAt: "",
  ...p,
});

const readers = [
  mkReader({ id: "r1", name: "Sofía" }),
  mkReader({ id: "r2", name: "Mateo" }),
];

describe("RecentReads", () => {
  it("renders up to 5 finished readings newest-first with a history link", () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      mk({
        id: `e${i}`,
        bookTitle: `Libro ${i}`,
        dateFinished: `2026-01-${String(i + 1).padStart(2, "0")}`,
      }),
    );
    render(<RecentReads events={events} readers={readers} />);
    // Newest is e6 (Jan 07).
    expect(screen.getByText("Libro 6")).toBeInTheDocument();
    expect(screen.queryByText("Libro 0")).not.toBeInTheDocument(); // outside top 5
    expect(
      screen.getByRole("link", { name: "Ver historial completo" }),
    ).toHaveAttribute("href", "/leido");
  });

  it("shows an empty state with no finished readings", () => {
    render(<RecentReads events={[]} readers={readers} />);
    expect(
      screen.getByText("Todavía no hay lecturas terminadas."),
    ).toBeInTheDocument();
  });
});
