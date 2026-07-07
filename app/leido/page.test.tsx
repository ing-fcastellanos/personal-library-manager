import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReadPage from "./page";

/** Tab switching for the "Leído" section (#26). Child panels are stubbed. */

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ reader: { id: "r1", name: "Sofía" }, loading: false }),
}));
vi.mock("@/components/reading/mark-as-read", () => ({
  MarkAsRead: () => <div>PANEL_REGISTRAR</div>,
}));
vi.mock("@/components/reading/reading-history", () => ({
  ReadingHistory: () => <div>PANEL_HISTORIAL</div>,
}));

describe("ReadPage", () => {
  it("defaults to Registrar and switches to Historial", () => {
    render(<ReadPage />);
    expect(screen.getByText("PANEL_REGISTRAR")).toBeInTheDocument();
    expect(screen.queryByText("PANEL_HISTORIAL")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Historial" }));
    expect(screen.getByText("PANEL_HISTORIAL")).toBeInTheDocument();
    expect(screen.queryByText("PANEL_REGISTRAR")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Historial" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
