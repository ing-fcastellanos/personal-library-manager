import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StarRating } from "./star-rating";

/** Component tests for the accessible star rating (#25). */

describe("StarRating", () => {
  it("sets a value on click", () => {
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("increments with the arrow keys", () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "2 estrellas" }), {
      key: "ArrowRight",
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("clears back to null when re-selecting the current value", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "3 estrellas" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clears via the Quitar control", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("renders read-only stars without controls", () => {
    render(<StarRating value={4} readOnly />);
    expect(
      screen.getByRole("img", { name: "4 de 5 estrellas" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
