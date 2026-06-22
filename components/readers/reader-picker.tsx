"use client";

import * as React from "react";
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
  className?: string;
}

/**
 * Reusable, accessible, **ungated** reader selector for attribution / filtering
 * (ADR-0013). Selecting is never gated by a PIN.
 */
export function ReaderPicker({
  value,
  onChange,
  readers: provided,
  className,
}: ReaderPickerProps) {
  const loaded = useReaders();
  const readers = provided ?? loaded.readers;
  const loading = provided ? false : loaded.loading;

  if (loading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    );
  }

  if (readers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay lectores todavía.</p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Lector"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {readers.map((reader) => {
        const selected = reader.id === value;
        return (
          <button
            key={reader.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(reader.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Avatar className="size-6">
              {reader.avatar ? <AvatarImage src={reader.avatar} alt="" /> : null}
              <AvatarFallback
                className="text-[10px]"
                style={
                  reader.displayColor
                    ? { backgroundColor: reader.displayColor, color: "#fff" }
                    : undefined
                }
              >
                {initials(reader.name)}
              </AvatarFallback>
            </Avatar>
            {reader.name}
          </button>
        );
      })}
    </div>
  );
}
