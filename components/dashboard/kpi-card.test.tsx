import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "./kpi-card";

/** Component tests for the KPI card (#27). */

describe("KpiCard", () => {
  it("renders the label and a formatted value", () => {
    render(<KpiCard label="Libros" value={1234} />);
    expect(screen.getByText("Libros")).toBeInTheDocument();
    expect(screen.getByText("1.234")).toBeInTheDocument();
  });

  it("shows a skeleton instead of the value while loading", () => {
    render(<KpiCard label="Libros" value={42} loading />);
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });
});
