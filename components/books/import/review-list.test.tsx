import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewList } from "./review-list";
import type { ProcessedRow } from "./process";

function row(overrides: Partial<ProcessedRow> = {}): ProcessedRow {
  return {
    key: "row-0",
    source: {
      title: "Rayuela",
      authors: ["Julio Cortázar"],
      isbn: "9780307474728",
      rating: 4,
      review: null,
      dateFinished: "2026-06-01",
    },
    candidate: null,
    duplicate: null,
    recommendation: "add-new",
    include: true,
    physical: true,
    action: "create-new",
    ...overrides,
  };
}

describe("ReviewList", () => {
  it("excluding a row updates it to include: false", () => {
    const onChange = vi.fn();
    render(<ReviewList rows={[row()]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Incluir Rayuela"));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ include: false }),
    ]);
  });

  it("marking a row digital updates physical: false", () => {
    const onChange = vi.fn();
    render(<ReviewList rows={[row()]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Formato"), {
      target: { value: "digital" },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ physical: false }),
    ]);
  });

  it("shows no duplicate badge when there is no match", () => {
    render(<ReviewList rows={[row()]} onChange={vi.fn()} />);
    expect(screen.queryByText(/duplicado|biblioteca/)).not.toBeInTheDocument();
  });

  it("shows a duplicate badge and lets the reader override the action", () => {
    const onChange = vi.fn();
    const duplicateRow = row({
      duplicate: {
        book: {
          id: "b9",
          title: "Rayuela (ed. 1963)",
          authors: ["Julio Cortázar"],
          isbn13: "9780307474728",
        },
        tier: "exact",
        score: 1,
        existingCopies: 1,
        suggestedAction: "add-copy",
      },
      recommendation: "add-copy",
      action: "use-existing",
    });
    render(<ReviewList rows={[duplicateRow]} onChange={onChange} />);
    expect(screen.getByText(/Ya está en tu biblioteca/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crear nuevo" }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ action: "create-new" }),
    ]);
  });
});
