import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "./bar-chart";

/** Component tests for the SVG bar chart (#28). */

describe("BarChart", () => {
  it("renders one bar per entry with label and value text", () => {
    render(
      <BarChart
        title="Libros por autor"
        data={[
          { key: "borges", label: "Borges", count: 5 },
          { key: "otros", label: "Otros", count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("Libros por autor")).toBeInTheDocument();
    expect(screen.getByText("Borges")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Otros")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows the empty message with no data", () => {
    render(
      <BarChart
        title="Lecturas por categoría"
        data={[]}
        emptyMessage="Todavía no hay lecturas terminadas."
      />,
    );
    expect(
      screen.getByText("Todavía no hay lecturas terminadas."),
    ).toBeInTheDocument();
  });

  it("scales bar widths relative to the max value", () => {
    const { container } = render(
      <BarChart
        title="X"
        data={[
          { key: "a", label: "A", count: 10 },
          { key: "b", label: "B", count: 5 },
        ]}
      />,
    );
    const rects = container.querySelectorAll("rect.fill-primary");
    expect(rects).toHaveLength(2);
    const wA = Number(rects[0].getAttribute("width"));
    const wB = Number(rects[1].getAttribute("width"));
    expect(wA).toBeGreaterThan(wB);
  });
});
