import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ReaderTrends } from "./reader-trends";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/** Component tests for the per-reader trends comparison (#29). */

const mk = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: null,
  rating: null,
  review: null,
  publishPending: false,
  bookTitle: "T",
  bookAuthors: [],
  isbn13: null,
  coverUrl: null,
  createdAt: "",
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

describe("ReaderTrends", () => {
  it("shows both readers side by side, including one with no readings", () => {
    const events = [
      mk({ id: "e1", readerId: "r1", dateFinished: "2026-06-01" }),
      mk({ id: "e2", readerId: "r1", dateFinished: "2026-07-01" }),
    ];
    render(<ReaderTrends events={events} readers={readers} />);
    expect(screen.getByText("Sofía")).toBeInTheDocument();
    expect(screen.getByText("Mateo")).toBeInTheDocument();

    // Mateo has no finished readings: unavailable stats shown as "—", not omitted.
    const mateoCard = screen.getByText("Mateo").closest("div")!.parentElement!;
    expect(within(mateoCard).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders nothing when there are no readers", () => {
    const { container } = render(<ReaderTrends events={[]} readers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
