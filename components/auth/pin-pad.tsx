"use client";

import * as React from "react";
import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PinPadProps {
  /** Number of digits. Default 4. */
  length?: number;
  /** Current entered value (controlled). */
  value: string;
  onChange: (next: string) => void;
  /** Renders the dots in the error color and clears nothing automatically. */
  error?: boolean;
  /** Fired when the value reaches `length` digits. */
  onComplete?: (value: string) => void;
  className?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/**
 * Mobile numeric PIN keypad with a dot progress indicator.
 *
 * Accessibility: each key is a real <button> (44px+ touch target), reachable by
 * Tab; the whole component also listens for hardware-keyboard digits / Backspace
 * while focused. The dots expose progress via aria-label.
 */
export function PinPad({
  length = 4,
  value,
  onChange,
  error = false,
  onComplete,
  className,
}: PinPadProps) {
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completedRef.current = false;
  }, [value, length, onComplete]);

  const push = React.useCallback(
    (d: string) => {
      if (value.length >= length) return;
      onChange(value + d);
    },
    [value, length, onChange]
  );

  const pop = React.useCallback(() => {
    if (value.length === 0) return;
    onChange(value.slice(0, -1));
  }, [value, onChange]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      push(e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      pop();
    }
  }

  return (
    <div className={cn("flex flex-col", className)} onKeyDown={onKeyDown}>
      {/* Progress dots */}
      <div
        className="flex justify-center gap-4 py-2"
        role="img"
        aria-label={`${value.length} de ${length} dígitos ingresados`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <span
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-colors",
                error
                  ? "border-destructive bg-destructive"
                  : filled
                    ? "border-primary bg-primary"
                    : "border-border bg-transparent"
              )}
            />
          );
        })}
      </div>

      {/* Keypad */}
      <div
        role="group"
        aria-label="Teclado numérico"
        className="mt-2 grid grid-cols-3 gap-3.5"
      >
        {KEYS.map((k, i) => {
          if (k === "") return <span key={i} aria-hidden="true" />;
          if (k === "del") {
            return (
              <button
                key={i}
                type="button"
                aria-label="Borrar"
                onClick={pop}
                className="flex h-[62px] items-center justify-center rounded-2xl border border-border bg-transparent text-foreground transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Delete className="size-6" aria-hidden="true" />
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              aria-label={`Dígito ${k}`}
              onClick={() => push(k)}
              className="flex h-[62px] items-center justify-center rounded-2xl border border-border bg-card text-2xl font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
