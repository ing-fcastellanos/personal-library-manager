import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QrCode } from "./qr-code";
import QRCode from "qrcode";

/**
 * Component tests for the canvas QR renderer (#31). jsdom has no real 2D
 * canvas context, so `qrcode` is mocked — these assert the component drives
 * `toCanvas` correctly, not the pixel output.
 */
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));

beforeEach(() => {
  vi.mocked(QRCode.toCanvas).mockClear();
});

describe("QrCode", () => {
  it("renders a canvas sized to the given size, and draws the value", () => {
    const { container } = render(
      <QrCode value="https://x/scan?action=add" size={120} />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("width", "120");
    expect(canvas).toHaveAttribute("height", "120");
    expect(QRCode.toCanvas).toHaveBeenCalledWith(
      canvas,
      "https://x/scan?action=add",
      expect.objectContaining({ errorCorrectionLevel: "M", width: 120 }),
    );
  });

  it("is decorative (aria-hidden) since the canvas can't be read by assistive tech", () => {
    const { container } = render(
      <QrCode value="https://x/scan?action=dashboard" />,
    );
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("redraws when the value changes", () => {
    const { rerender } = render(<QrCode value="https://x/scan?action=add" />);
    expect(QRCode.toCanvas).toHaveBeenCalledTimes(1);
    rerender(<QrCode value="https://x/scan?action=finish" />);
    expect(QRCode.toCanvas).toHaveBeenCalledTimes(2);
    expect(QRCode.toCanvas).toHaveBeenLastCalledWith(
      expect.anything(),
      "https://x/scan?action=finish",
      expect.anything(),
    );
  });
});
