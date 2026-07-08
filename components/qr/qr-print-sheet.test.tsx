import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QrPrintSheet } from "./qr-print-sheet";

/**
 * Component tests for the QR print sheet (#31). No auth provider is mocked
 * here on purpose — the page must render without one (spec: loads without a
 * session). `qrcode` is mocked since jsdom has no real 2D canvas context.
 */
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("QrPrintSheet", () => {
  it("renders the three action QR codes with real-text labels, without any auth context", async () => {
    render(<QrPrintSheet />);
    expect(await screen.findByText("Ver dashboard")).toBeInTheDocument();
    expect(screen.getByText("Agregar libro")).toBeInTheDocument();
    expect(screen.getByText("Registrar leído")).toBeInTheDocument();
  });

  it("calls window.print() when Imprimir is activated", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<QrPrintSheet />);
    screen.getByRole("button", { name: "Imprimir" }).click();
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("links back to Ajustes", () => {
    render(<QrPrintSheet />);
    expect(
      screen.getByRole("link", { name: "Volver a Ajustes" }),
    ).toHaveAttribute("href", "/ajustes");
  });
});
