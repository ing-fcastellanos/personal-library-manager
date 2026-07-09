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
        headers={headers}
        value={defaultMapping("goodreads")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Título")).toHaveValue("Title");
    expect(screen.getByLabelText("Estado")).toHaveValue("Exclusive Shelf");
  });

  it("lets the reader change a field's mapped column", () => {
    const onChange = vi.fn();
    render(
      <MappingStep
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

  it("disables Continuar when title or status is unmapped", () => {
    render(
      <MappingStep
        headers={headers}
        value={defaultMapping("unknown")}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
});
