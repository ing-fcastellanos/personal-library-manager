import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MappingStep } from "./mapping-step";
import { defaultMapping } from "./format";

const headers = [
  "Title",
  "Author",
  "ISBN13",
  "My Rating",
  "My Review",
  "Date Read",
  "Exclusive Shelf",
];

describe("MappingStep", () => {
  it("pre-selects the default mapping for a detected format", () => {
    render(
      <MappingStep
        format="goodreads"
        headers={headers}
        value={defaultMapping("goodreads")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Título/)).toHaveValue("Title");
    expect(screen.getByLabelText(/Estado/)).toHaveValue("Exclusive Shelf");
  });

  it("shows a success banner naming the detected format", () => {
    render(
      <MappingStep
        format="storygraph"
        headers={headers}
        value={defaultMapping("storygraph")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/Detectamos un export de/)).toBeInTheDocument();
    expect(screen.getByText("StoryGraph")).toBeInTheDocument();
  });

  it("shows a warning banner when the format wasn't detected", () => {
    render(
      <MappingStep
        format="unknown"
        headers={headers}
        value={defaultMapping("unknown")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/No reconocimos el formato/)).toBeInTheDocument();
  });

  it("lets the reader change a field's mapped column", () => {
    const onChange = vi.fn();
    render(
      <MappingStep
        format="goodreads"
        headers={headers}
        value={defaultMapping("goodreads")}
        onChange={onChange}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Autor"), {
      target: { value: "ISBN13" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ author: "ISBN13" }),
    );
  });

  it("does not call onConfirm on render — only when the button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <MappingStep
        format="goodreads"
        headers={headers}
        value={defaultMapping("goodreads")}
        onChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables Continuar when title or status is unmapped, with a helper message", () => {
    render(
      <MappingStep
        format="unknown"
        headers={headers}
        value={defaultMapping("unknown")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(
      screen.getByText(/Mapeá al menos Título y Estado/),
    ).toBeInTheDocument();
  });

  it("marks Título and Estado as aria-required, not the optional fields", () => {
    render(
      <MappingStep
        format="goodreads"
        headers={headers}
        value={defaultMapping("goodreads")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Título/)).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByLabelText(/Estado/)).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByLabelText("Autor")).not.toHaveAttribute("aria-required");
  });
});
