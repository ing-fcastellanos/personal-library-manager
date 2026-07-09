"use client";

import * as React from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TARGET_FIELDS, type ColumnMapping, type ImportFormat } from "./format";

const FORMAT_LABEL: Record<Exclude<ImportFormat, "unknown">, string> = {
  goodreads: "Goodreads",
  storygraph: "StoryGraph",
};

/**
 * Column-mapping screen (#35, design D2). Always rendered — even for a
 * detected format — so a misdetection is caught by the reader looking at the
 * screen rather than a silent wrong guess. Nothing downstream runs until
 * `onConfirm` is called.
 */
export function MappingStep({
  format,
  headers,
  value,
  onChange,
  onConfirm,
}: {
  format: ImportFormat;
  headers: string[];
  value: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
  onConfirm: () => void;
}) {
  const canContinue = !!value.title && !!value.status;

  return (
    <div className="space-y-4">
      {format !== "unknown" ? (
        <div className="flex items-center gap-2.5 rounded-[13px] border border-success/30 bg-success-bg px-3.5 py-3">
          <CheckCircle2
            className="size-[18px] shrink-0 text-success"
            aria-hidden="true"
          />
          <p className="text-[12.5px] font-semibold leading-snug">
            Detectamos un export de <strong>{FORMAT_LABEL[format]}</strong>.
            Revisá el emparejamiento.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-[13px] border border-warning/40 bg-warning-bg px-3.5 py-3">
          <TriangleAlert
            className="size-[18px] shrink-0 text-warning"
            aria-hidden="true"
          />
          <p className="text-[12.5px] font-semibold leading-snug">
            No reconocimos el formato. Emparejá cada campo a mano.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {TARGET_FIELDS.map(({ field, label, required }) => {
          const empty = !value[field];
          return (
            <div key={field}>
              <label
                htmlFor={`map-${field}`}
                className="mb-1.5 flex items-center gap-1 text-sm font-semibold"
              >
                {label}
                {required && (
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                )}
              </label>
              <select
                id={`map-${field}`}
                value={value[field]}
                onChange={(e) =>
                  onChange({ ...value, [field]: e.target.value })
                }
                aria-required={required || undefined}
                className={cn(
                  "h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
                  required && empty ? "border-warning/60" : "border-input",
                )}
              >
                <option value="">— sin mapear —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canContinue}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-75"
          aria-disabled={!canContinue}
        >
          Continuar
        </button>
        {!canContinue && (
          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            Mapeá al menos Título y Estado para seguir.
          </p>
        )}
      </div>
    </div>
  );
}
