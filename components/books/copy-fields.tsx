"use client";

import * as React from "react";
import { BookOpen, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Field } from "./field";
import { type CopyData, type Shelf, CONDITIONS } from "./types";

export interface CopyFieldsProps {
  value: CopyData;
  onChange: (next: CopyData) => void;
  shelves?: Shelf[];
  idPrefix?: string;
  /**
   * "collapsible" (mobile default) renders the header toggle; "panel" keeps it
   * always-open for the md+ right column.
   */
  variant?: "collapsible" | "panel";
}

/**
 * Shared "este ejemplar" (Copy) fields: estante, condición, adquirido, notas.
 * Reused by add (#14) and edit. Collapsible on mobile, fixed panel at md+.
 */
export function CopyFields({
  value,
  onChange,
  shelves = [],
  idPrefix = "c",
  variant = "collapsible",
}: CopyFieldsProps) {
  const [open, setOpen] = React.useState(true);
  const id = (k: string) => `${idPrefix}-${k}`;
  const set = <K extends keyof CopyData>(k: K, v: CopyData[K]) =>
    onChange({ ...value, [k]: v });
  const collapsible = variant === "collapsible";

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        aria-expanded={collapsible ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 bg-card p-3.5 text-left",
          !collapsible && "cursor-default",
        )}
      >
        <BookOpen
          className="size-[17px] text-muted-foreground"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold">Este ejemplar</p>
          <p className="text-xs text-muted-foreground">
            Estante, condición, fecha, notas
          </p>
        </div>
        {collapsible && (
          <ChevronDown
            className={cn(
              "size-[18px] text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        )}
      </button>

      <div
        className={cn(
          "flex-col gap-4 border-t border-border p-3.5 pt-3",
          collapsible ? (open ? "flex" : "hidden") : "flex",
        )}
      >
        <Field id={id("shelf")} label="Estante">
          <Select
            value={value.shelfId}
            onValueChange={(v) => set("shelfId", v)}
          >
            <SelectTrigger id={id("shelf")} className="h-11">
              <SelectValue placeholder="Elegí un estante (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {shelves.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex gap-3">
          <Field id={id("cond")} label="Condición" className="flex-1">
            <Select
              value={value.condition}
              onValueChange={(v) => set("condition", v)}
            >
              <SelectTrigger id={id("cond")} className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={id("acq")} label="Adquirido" className="flex-1">
            <Input
              id={id("acq")}
              type="date"
              value={value.acquiredAt ?? ""}
              onChange={(e) => set("acquiredAt", e.target.value)}
              className="h-11"
            />
          </Field>
        </div>

        <Field id={id("notes")} label="Notas">
          <textarea
            id={id("notes")}
            rows={2}
            value={value.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Edición firmada, regalo de…"
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </Field>
      </div>
    </div>
  );
}
