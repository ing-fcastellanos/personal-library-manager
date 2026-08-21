"use client";

import * as React from "react";
import { Check, Loader2, SearchX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  CoverOption,
  CoverSearchPhase,
} from "./use-publisher-cover-search";

/**
 * Inline "edit publisher → auto-search matching cover" widget (#22). Owns the
 * Editorial input itself (rather than sitting beside a separate one) since the
 * search is scoped to whatever the reader types here. Presentational only — all
 * state/fetching lives in `usePublisherCoverSearch`; ported from the handed-off
 * Claude Design prototype (`Editorial Cover Panel.dc.html`).
 */
export interface PublisherCoverSearchProps {
  publisher: string;
  onPublisherChange: (value: string) => void;
  phase: CoverSearchPhase;
  options: CoverOption[];
  selectedId: string | null;
  onPick: (id: string) => void;
  singleCaption: string;
  /** Collapses the widget back down — the row (shelf) or the panel (form). */
  onDone: () => void;
  /** "Editando editorial de «título»" — shelf context only. */
  showHeader?: boolean;
  bookTitle?: string;
  inputId: string;
  className?: string;
}

export function PublisherCoverSearch({
  publisher,
  onPublisherChange,
  phase,
  options,
  selectedId,
  onPick,
  singleCaption,
  onDone,
  showHeader = false,
  bookTitle,
  inputId,
  className,
}: PublisherCoverSearchProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {showHeader && (
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          Editando editorial de «{bookTitle}»
        </p>
      )}

      <div>
        <Label htmlFor={inputId} className="mb-1.5 block text-[12.5px]">
          Editorial
        </Label>
        <Input
          id={inputId}
          value={publisher}
          onChange={(e) => onPublisherChange(e.target.value)}
          placeholder="Nombre de la editorial"
          autoComplete="off"
          className="h-10"
        />
      </div>

      {phase === "searching" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 py-0.5"
        >
          <Loader2
            className="size-3.5 animate-spin text-primary"
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">
            Buscando portada para esta editorial…
          </span>
        </div>
      )}

      {phase === "multi" && (
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">
            {options.length} {options.length === 1 ? "portada" : "portadas"}{" "}
            para esa editorial
          </p>
          <div
            role="radiogroup"
            aria-label="Elegí la portada"
            className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-2"
          >
            {options.map((o) => {
              const active = o.id === selectedId;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onPick(o.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "relative block h-[74px] w-[50px] overflow-visible rounded-md border-[1.5px]",
                      active
                        ? "border-primary shadow-md"
                        : "border-border shadow-sm",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.coverUrl}
                      alt=""
                      className="size-full rounded-[4px] object-cover"
                    />
                    {active && (
                      <span className="absolute -right-1.5 -top-1.5 grid size-[18px] place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check
                          className="size-[11px]"
                          strokeWidth={3.4}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </span>
                  <span className="text-center text-[10px] leading-tight text-muted-foreground">
                    {o.caption}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            className="h-9 w-full text-[13.5px]"
            onClick={onDone}
          >
            Listo
          </Button>
        </div>
      )}

      {phase === "single" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Check
              className="size-[15px] text-success"
              strokeWidth={2.8}
              aria-hidden="true"
            />
            <span className="text-[12.5px] font-semibold text-success">
              Portada actualizada
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Una sola coincidencia: {singleCaption}
          </p>
          <Button
            size="sm"
            className="h-9 w-full text-[13.5px]"
            onClick={onDone}
          >
            Listo
          </Button>
        </div>
      )}

      {phase === "none" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border p-2.5">
          <SearchX
            className="mt-px size-[18px] shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold leading-tight">
              No encontramos portada para esa editorial
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Se mantiene la portada original.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
