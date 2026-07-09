"use client";

import * as React from "react";
import type { ProcessedRow } from "./process";

/**
 * Per-row review list (#35, design D5/D6). Duplicate matches show as a
 * non-blocking badge with an inline override, never a modal — the reader
 * keeps reviewing other rows without dismissing anything (spec: "Review each
 * row before importing").
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
        return (
          <li key={row.key} className="rounded-2xl border bg-card p-3.5">
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={row.include}
                onChange={(e) => update(row.key, { include: e.target.checked })}
                aria-label={`Incluir ${title}`}
                className="mt-1 size-5 shrink-0 rounded border-input accent-primary"
              />
              <CoverThumb url={row.candidate?.coverUrl ?? null} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight">
                  {title}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {authors.join(", ")}
                </p>
                {row.duplicate && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                      {row.recommendation === "add-copy"
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
                      className="text-[11px] font-semibold text-primary hover:underline"
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
    <span className="relative h-[66px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
