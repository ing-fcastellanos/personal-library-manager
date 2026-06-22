"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

/** Reusable controlled numeric PIN keypad (mobile-first). Reused by #11. */
export function PinPad({ value, onChange, length = 4 }: PinPadProps) {
  function press(digit: string) {
    if (value.length < length) onChange(value + digit);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }

  const keyClass =
    "h-14 rounded-lg border border-border text-lg font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto max-w-xs space-y-5">
      <div className="flex justify-center gap-3" aria-hidden="true">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border",
              i < value.length
                ? "border-primary bg-primary"
                : "border-border",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} className={keyClass}>
            {k}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} className={keyClass}>
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Borrar"
          className={keyClass}
        >
          <Delete className="mx-auto size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
