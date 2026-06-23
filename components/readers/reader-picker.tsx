"use client";

import * as React from "react";
import { Check, UserPlus } from "lucide-react";
import type { Reader } from "@/lib/types/reader";
import { useReaders } from "@/components/readers/use-readers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ReaderPickerProps {
  /** Selected reader id (controlled). */
  value: string | null;
  onChange: (readerId: string) => void;
  /** Optional explicit readers; otherwise loaded from `/api/readers`. */
  readers?: Reader[];
  /** Called from the empty state to route the user to add a reader (Settings). */
  onAddReader?: () => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Attribution picker ("¿quién leyó?") — horizontal, compact chips with avatar +
 * name (ADR-0013). **Ungated**: selecting is never protected by a PIN.
 *
 * Implemented as a WAI-ARIA radiogroup with roving tabindex: arrow keys move the
 * selection, the group is a single tab stop. States: default / selected / focus /
 * loading / empty.
 */
export function ReaderPicker({
  value,
  onChange,
  readers: provided,
  onAddReader,
  className,
  "aria-label": ariaLabel = "Lector",
}: ReaderPickerProps) {
  const loaded = useReaders();
  const readers = provided ?? loaded.readers;
  const loading = provided ? false : loaded.loading;
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  if (loading) {
    return (
      <div className={cn("flex flex-wrap gap-2.5", className)} aria-busy="true">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-full border border-border bg-background py-1.5 pl-1.5 pr-4"
          >
            <Skeleton className="size-[30px] rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (readers.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border p-3.5",
          className,
        )}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <UserPlus className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Sin lectores</p>
          <p className="text-xs text-muted-foreground">
            {onAddReader ? (
              <button
                type="button"
                onClick={onAddReader}
                className="rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Agregá uno en Ajustes.
              </button>
            ) : (
              "Agregá uno en Ajustes."
            )}
          </p>
        </div>
      </div>
    );
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp"
    )
      return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = (index + dir + readers.length) % readers.length;
    onChange(readers[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2.5", className)}
    >
      {readers.map((reader, i) => {
        const checked = reader.id === value;
        return (
          <button
            key={reader.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // roving tabindex: only the checked (or first) chip is tabbable
            tabIndex={checked || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(reader.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex items-center gap-2.5 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-3.5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              checked
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-background text-foreground hover:bg-accent/50",
            )}
          >
            <Avatar className="size-[30px] text-xs font-bold">
              {reader.avatar ? (
                <AvatarImage src={reader.avatar} alt="" />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-xs font-bold",
                  checked && "bg-primary text-primary-foreground",
                )}
              >
                {initials(reader.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{reader.name}</span>
            {checked && (
              <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
