import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QrCode } from "./qr-code";
import QRCode from "qrcode";

/**
 * Component tests for the canvas QR renderer (#31). jsdom has no real 2D
 * canvas context, so `qrcode` is mocked — these assert the component drives
 * `toCanvas` correctly, not the pixel output. The mock also reproduces the
 * real library's side effect (it force-sets `canvas.style.width/height` to
 * the draw resolution as part of rendering — see node_modules/qrcode/lib/
 * renderer/canvas.js `clearCanvas`), since that's exactly what prod caught
 * and this suite originally missed by mocking it away entirely.
 */
vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn(
      (canvas: HTMLCanvasElement, _value: string, opts: { width: number }) => {
        canvas.style.width = `${opts.width}px`;
        canvas.style.height = `${opts.width}px`;
        return Promise.resolve(canvas);
      },
    ),
  },
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

  it("keeps a caller-provided display size after the library's own draw finishes", async () => {
    // Regression: qrcode's canvas renderer sets canvas.style.width/height to
    // the draw resolution (`size`) as a side effect — that must not clobber a
    // deliberately different display size (e.g. a high-res print draw scaled
    // down to a physical cm size via `style`).
    const { container } = render(
      <QrCode
        value="https://x/scan?action=add"
        size={480}
        style={{ width: "4.2cm", height: "4.2cm" }}
      />,
    );
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    await waitFor(() => expect(canvas.style.width).toBe("4.2cm"));
    expect(canvas.style.height).toBe("4.2cm");
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
