"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { BookData } from "./types";

/** A single differing field between the current value and the source. */
export interface FieldDiff {
  key: keyof BookData | "cover";
  label: string;
  /** Display strings for each side. */
  mine: string;
  source: string;
  /** The raw source value to apply when "traer este valor" is chosen. */
  sourceValue: unknown;
  /** Cover diffs default to "keep mine" (user upload wins). */
  isCover?: boolean;
}

export type DiffChoice = Record<string, "mine" | "source">;

export interface ReEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diffs: FieldDiff[];
  /** Apply the chosen "source" values; keys map to FieldDiff.key. */
  onApply: (choices: DiffChoice, diffs: FieldDiff[]) => void;
}

/**
 * Re-enrich diff panel. Lists ONLY the fields that differ from the source; per
 * field the user picks "El mío" or "De la fuente". A user-uploaded cover starts
 * on "mantener" (mine). Built on the shared Dialog (focus trap + Esc).
 */
export function ReEnrichDialog({
  open,
  onOpenChange,
  diffs,
  onApply,
}: ReEnrichDialogProps) {
  const initial = React.useMemo<DiffChoice>(
    () => Object.fromEntries(diffs.map((d) => [d.key, "mine"])),
    [diffs],
  );
  const [choices, setChoices] = React.useState<DiffChoice>(initial);
  // Reset choices when the diff set changes (store-previous-value pattern, which
  // adjusts state during render rather than in an effect).
  const [seenDiffs, setSeenDiffs] = React.useState(diffs);
  if (seenDiffs !== diffs) {
    setSeenDiffs(diffs);
    setChoices(initial);
  }

  const takeCount = Object.values(choices).filter((v) => v === "source").length;
  const pick = (key: string, v: "mine" | "source") =>
    setChoices((c) => ({ ...c, [key]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Re-enriquecer desde fuentes</DialogTitle>
          <DialogDescription>
            Encontramos {diffs.length}{" "}
            {diffs.length === 1 ? "campo distinto" : "campos distintos"}. Elegí
            cuáles traer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-5">
          {diffs.map((d) => {
            const mine = (choices[d.key] ?? "mine") === "mine";
            return (
              <div
                key={String(d.key)}
                className="rounded-xl border border-border bg-card p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {d.label}
                  </span>
                  {d.isCover && <Badge variant="secondary">Tu portada</Badge>}
                </div>
                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-label={d.label}
                >
                  <DiffChoiceButton
                    role="radio"
                    selected={mine}
                    onClick={() => pick(String(d.key), "mine")}
                    caption="El mío"
                    captionClass="text-muted-foreground"
                    value={d.mine}
                  />
                  <DiffChoiceButton
                    role="radio"
                    selected={!mine}
                    onClick={() => pick(String(d.key), "source")}
                    caption="De la fuente"
                    captionClass="text-primary"
                    value={d.source}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="p-5 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onApply(choices, diffs)}
            disabled={takeCount === 0}
          >
            Aplicar {takeCount} {takeCount === 1 ? "cambio" : "cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffChoiceButton({
  selected,
  onClick,
  caption,
  captionClass,
  value,
  role,
}: {
  selected: boolean;
  onClick: () => void;
  caption: string;
  captionClass: string;
  value: string;
  role?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[10px] border-[1.5px] p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-accent"
          : "border-border bg-background hover:bg-accent/40",
      )}
    >
      <div className={cn("mb-0.5 text-[10.5px] font-semibold", captionClass)}>
        {caption}
      </div>
      <div className="text-[13px] font-semibold leading-tight text-foreground">
        {value}
      </div>
    </button>
  );
}
