import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadingGoal } from "./reading-goal";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";

/** Component tests for the annual reading-goal widget (#30). */

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

const mkReader = (p: Partial<Reader>): Reader => ({
  id: "r",
  name: "R",
  preferences: {},
  createdAt: "",
  updatedAt: "",
  ...p,
});

const event = (p: Partial<ReadingEvent>): ReadingEvent => ({
  id: "e",
  readerId: "r1",
  bookId: "b1",
  status: "finished",
  copyId: null,
  dateStarted: null,
  dateFinished: null,
  rating: null,
  review: null,
  bookTitle: "T",
  bookAuthors: [],
  isbn13: null,
  coverUrl: null,
  createdAt: "",
  updatedAt: "",
  ...p,
});

const year = String(new Date().getFullYear());

describe("ReadingGoal", () => {
  it("shows a CTA for the active reader with no goal, and plain text for another reader", () => {
    const readers = [
      mkReader({ id: "r1", name: "Sofía" }),
      mkReader({ id: "r2", name: "Mateo" }),
    ];
    render(
      <ReadingGoal
        events={[]}
        readers={readers}
        activeReaderId="r1"
        onGoalSaved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Fijá tu meta" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Sin meta").length +
        screen.getAllByText(/Sin meta este año/).length,
    ).toBeGreaterThan(0);
  });

  it("does not show a set-goal CTA for a reader who isn't active", () => {
    const readers = [mkReader({ id: "r2", name: "Mateo" })];
    render(
      <ReadingGoal
        events={[]}
        readers={readers}
        activeReaderId="r1"
        onGoalSaved={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Fijá tu meta" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Sin meta")).toBeInTheDocument();
  });

  it("shows progress and projection when a goal is set and not yet met", () => {
    const readers = [
      mkReader({
        id: "r1",
        name: "Sofía",
        preferences: { readingGoals: { [year]: 24 } },
      }),
    ];
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: `${year}-01-15` }),
    ];
    render(
      <ReadingGoal
        events={events}
        readers={readers}
        activeReaderId="r1"
        onGoalSaved={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("/ 24")).toBeInTheDocument();
    expect(screen.queryByText("Cumplida")).not.toBeInTheDocument();
  });

  it("shows a Cumplida badge when the goal is met or exceeded", () => {
    const readers = [
      mkReader({
        id: "r1",
        name: "Sofía",
        preferences: { readingGoals: { [year]: 1 } },
      }),
    ];
    const events = [
      event({ id: "e1", readerId: "r1", dateFinished: `${year}-01-15` }),
    ];
    render(
      <ReadingGoal
        events={events}
        readers={readers}
        activeReaderId="r1"
        onGoalSaved={vi.fn()}
      />,
    );
    expect(screen.getByText("Cumplida")).toBeInTheDocument();
  });

  it("lets the active reader set a goal, PATCHing the merged preferences", async () => {
    const onGoalSaved = vi.fn();
    const reader = mkReader({
      id: "r1",
      name: "Sofía",
      preferences: { theme: "dark" },
    });
    let patchBody: Record<string, unknown> | null = null;
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/readers/r1") && init?.method === "PATCH") {
        patchBody = JSON.parse(String(init.body));
        return jsonResponse({ ...reader, preferences: patchBody!.preferences });
      }
      return jsonResponse({}, false);
    }) as unknown as typeof fetch;

    render(
      <ReadingGoal
        events={[]}
        readers={[reader]}
        activeReaderId="r1"
        onGoalSaved={onGoalSaved}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fijá tu meta" }));
    fireEvent.change(screen.getByLabelText("Meta anual de Sofía"), {
      target: { value: "24" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onGoalSaved).toHaveBeenCalledTimes(1));
    expect(patchBody).toEqual({
      preferences: { theme: "dark", readingGoals: { [year]: 24 } },
    });
  });

  it("renders nothing with no readers", () => {
    const { container } = render(
      <ReadingGoal
        events={[]}
        readers={[]}
        activeReaderId={null}
        onGoalSaved={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
