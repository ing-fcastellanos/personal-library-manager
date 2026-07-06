import { isValidBookIsbn13 } from "@/services/enrichment/normalize";

/**
 * Live ISBN-barcode scanner (#23). Wraps the camera stream and a decoder behind a
 * `start(video, onResult) / stop()` interface so the React flow never touches the
 * decoding engine. Uses the native `BarcodeDetector` when available (Android /
 * Chromium, zero bundle cost) and lazily loads `@zxing/browser` otherwise (notably
 * iOS Safari), so its weight is only paid where the native API is missing. Only
 * codes that pass `isValidBookIsbn13` (978/979 + checksum) reach `onResult`, so
 * EAN-5 supplements and product barcodes are filtered out.
 *
 * Browser-only; camera errors from `getUserMedia` propagate to the caller (which
 * falls back to manual ISBN entry).
 */

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
}

/** Minimal shape of `@zxing/browser` controls we use. */
interface ScannerControls {
  stop(): void;
}

export interface IsbnScanner {
  /** Acquire the camera into `video` and start decoding; valid ISBNs go to `onResult`. */
  start(
    video: HTMLVideoElement,
    onResult: (isbn: string) => void,
  ): Promise<void>;
  /** Stop decoding and release the camera. Idempotent. */
  stop(): void;
}

const DECODE_INTERVAL_MS = 200;

export function createIsbnScanner(): IsbnScanner {
  let stopped = false;
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controls: ScannerControls | null = null;
  let onResult: ((isbn: string) => void) | null = null;

  function emit(raw: string) {
    if (stopped || !onResult) return;
    const cleaned = raw.replace(/[\s-]/g, "");
    if (isValidBookIsbn13(cleaned)) onResult(cleaned);
  }

  function runNative(video: HTMLVideoElement, Ctor: BarcodeDetectorCtor) {
    const detector = new Ctor({ formats: ["ean_13"] });
    const tick = async () => {
      if (stopped) return;
      try {
        for (const code of await detector.detect(video)) emit(code.rawValue);
      } catch {
        /* transient per-frame decode error — keep going */
      }
      if (!stopped) timer = setTimeout(tick, DECODE_INTERVAL_MS);
    };
    void tick();
  }

  async function runZxing(video: HTMLVideoElement) {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    if (stopped) return;
    const reader = new BrowserMultiFormatReader();
    controls = await reader.decodeFromVideoElement(video, (result) => {
      if (result) emit(result.getText());
    });
    if (stopped) controls.stop();
  }

  return {
    async start(video, cb) {
      onResult = cb;
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      video.setAttribute("playsinline", "true"); // inline playback on iOS
      await video.play();
      const Ctor = (
        window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
      ).BarcodeDetector;
      if (Ctor) runNative(video, Ctor);
      else await runZxing(video);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      onResult = null;
    },
  };
}
