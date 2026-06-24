"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface TokenFieldProps {
  /** Current tokens (authors, categories…). */
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** aria-label for the text input. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Multi-value chip input built from Badge + Input. Used for "autores" and
 * "categorías". Enter or comma commits a token; Backspace on an empty input
 * removes the last one. Each chip has an accessible remove button.
 */
export function TokenField({
  value,
  onChange,
  placeholder = "Agregar…",
  ariaLabel,
  className,
}: TokenFieldProps) {
  const [draft, setDraft] = React.useState("");

  function commit() {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
    >
      {value.map((token) => (
        <Badge key={token} variant="secondary" className="gap-1 pl-2.5 pr-1">
          {token}
          <button
            type="button"
            aria-label={`Quitar ${token}`}
            onClick={() => onChange(value.filter((t) => t !== token))}
            className="grid size-[17px] place-items-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="text-[11px] leading-none">
              ×
            </span>
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        aria-label={ariaLabel}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        className="h-7 min-w-20 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {value.length === 0 && (
        <Plus
          className="mr-1 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
