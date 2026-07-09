"use client";

import * as React from "react";
import { Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessedRow } from "./process";

/**
 * Per-row review list (#35, design D5/D6). Duplicate matches show as a
 * non-blocking badge with an inline override, never a modal — the reader
 * keeps reviewing other rows without dismissing anything (spec: "Review each
 * row before importing"). An exact ISBN match badges as "already in your
 * library" (accent); an ambiguous title match badges as a warning — distinct
 * colors per the Claude Design handoff, since the two carry different risk.
 */
export function ReviewList({
  rows,
  onChange,
}: {
  rows: ProcessedRow[];
  onChange: (rows: ProcessedRow[]) => void;
}) {
  function update(key: string, patch: Partial<ProcessedRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const title = row.candidate?.title ?? row.source.title;
        const authors = row.candidate?.authors ?? row.source.authors;
        const isExactDup = row.duplicate && row.recommendation === "add-copy";
        return (
          <li
            key={row.key}
            className={cn(
              "rounded-2xl border bg-card p-3.5 transition-opacity",
              row.duplicate ? "border-warning/40" : "border-border",
              !row.include && "opacity-55",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="relative -m-1 mt-0 inline-flex size-11 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) =>
                    update(row.key, { include: e.target.checked })
                  }
                  aria-label={`${row.include ? "Excluir" : "Incluir"} ${title}`}
                  className="peer size-6 appearance-none rounded-[7px] border border-input bg-card checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Check
                  className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"
                  aria-hidden="true"
                />
              </span>
              <CoverThumb url={row.candidate?.coverUrl ?? null} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight">
                  {title}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {authors.join(", ")}
                </p>
                {row.duplicate && (
                  <div
                    className={cn(
                      "mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5",
                      isExactDup
                        ? "border-primary/30 bg-accent"
                        : "border-warning/40 bg-warning-bg",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11.5px] font-semibold",
                        isExactDup ? "text-accent-foreground" : "text-warning",
                      )}
                    >
                      {isExactDup
                        ? "Ya está en tu biblioteca"
                        : "Podría ser un duplicado"}{" "}
                      · {row.duplicate.book.title}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update(row.key, {
                          action:
                            row.action === "create-new"
                              ? "use-existing"
                              : "create-new",
                        })
                      }
                      className="text-[11.5px] font-bold text-primary underline-offset-2 hover:underline"
                    >
                      {row.action === "create-new"
                        ? "Usar existente"
                        : "Crear nuevo"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <label
                htmlFor={`format-${row.key}`}
                className="text-[12.5px] font-semibold text-muted-foreground"
              >
                Formato
              </label>
              <select
                id={`format-${row.key}`}
                value={row.physical ? "physical" : "digital"}
                onChange={(e) =>
                  update(row.key, { physical: e.target.value === "physical" })
                }
                className="h-9 rounded-lg border border-input bg-card px-2 text-[12.5px]"
              >
                <option value="physical">Físico</option>
                <option value="digital">Digital</option>
              </select>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CoverThumb({ url }: { url: string | null }) {
  return (
    <span className="relative h-[58px] w-[40px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-muted text-muted-foreground">
          <BookOpen className="size-4" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
