"use client";

import * as React from "react";
import QRCode from "qrcode";

/**
 * Canvas-based QR code (#31), rendered client-side via `qrcode` — no server
 * round-trip. Draws on mount (and on `value`/`size` change) rather than
 * on-demand, so a caller's print action always finds a fully-drawn canvas.
 * Decorative: the accessible label lives in the page alongside it (a QR
 * can't be "read" by assistive tech), matching how the app treats other
 * icon-only marks (aria-hidden + adjacent real text).
 */
export function QrCode({
  value,
  size = 160,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: "M",
      width: size,
      margin: 4,
    }).catch(() => {
      // Nothing actionable client-side on failure — the canvas just stays blank.
    });
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden="true"
      className="rounded-lg"
    />
  );
}
