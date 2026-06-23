import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

// Smoke test that exercises the jsdom project + React Testing Library setup.
describe("Button", () => {
  it("renders its children in the DOM", () => {
    render(<Button>Guardar</Button>);
    const btn = screen.getByRole("button", { name: "Guardar" });
    expect(btn).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
