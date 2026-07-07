"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible 1–5 star rating (#25). Interactive by default (radiogroup of five
 * `role="radio"` stars, keyboard-operable, clearable back to null); pass
 * `readOnly` for a static display of an existing rating. The scale is a fixed
 * integer 1–5 (the `ReadingEvent.rating` model enforces it — no half-stars).
 */
const STARS = [1, 2, 3, 4, 5] as const;

export function StarRating({
  value,
  onChange,
  readOnly = false,
  label = "Calificación",
  size = 24,
  className,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  label?: string;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (readOnly) {
    return (
      <span
        role="img"
        aria-label={value ? `${value} de 5 estrellas` : "Sin calificar"}
        className={cn("inline-flex items-center gap-0.5", className)}
      >
        {STARS.map((n) => (
          <Star
            key={n}
            aria-hidden="true"
            width={size}
            height={size}
            className={
              value != null && n <= value
                ? "fill-warning text-warning"
                : "fill-transparent text-muted-foreground/40"
            }
          />
        ))}
      </span>
    );
  }

  const active = hover ?? value ?? 0;

  function set(next: number | null) {
    onChange?.(next);
    if (next != null) btnRefs.current[next - 1]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, star: number) {
    const cur = value ?? 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      set(Math.min(5, cur + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = cur - 1;
      if (next < 1) {
        set(null);
        btnRefs.current[0]?.focus();
      } else set(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      set(1);
    } else if (e.key === "End") {
      e.preventDefault();
      set(5);
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      set(Number(e.key));
    } else if (["0", "Backspace", "Delete"].includes(e.key)) {
      e.preventDefault();
      set(null);
      btnRefs.current[0]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      // Toggle: selecting the current value again clears it.
      set(value === star ? null : star);
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex items-center"
        onMouseLeave={() => setHover(null)}
      >
        {STARS.map((n) => {
          // Roving tabindex: only the selected star (or the first, when unset)
          // is in the tab order; arrow keys move within the group.
          const tabbable = (value ?? 1) === n;
          return (
            <button
              key={n}
              ref={(el) => {
                btnRefs.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => set(value === n ? null : n)}
              onMouseEnter={() => setHover(n)}
              onKeyDown={(e) => onKeyDown(e, n)}
              className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                width={size}
                height={size}
                aria-hidden="true"
                className={cn(
                  "transition-colors",
                  n <= active
                    ? "fill-warning text-warning"
                    : "fill-transparent text-muted-foreground/50",
                )}
              />
            </button>
          );
        })}
      </div>
      {value != null && (
        <button
          type="button"
          onClick={() => set(null)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Quitar
        </button>
      )}
    </div>
  );
}
