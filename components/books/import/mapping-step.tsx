"use client";

import * as React from "react";
import { TARGET_FIELDS, type ColumnMapping } from "./format";

/**
 * Column-mapping screen (#35, design D2). Always rendered — even for a
 * detected format — so a misdetection is caught by the reader looking at the
 * screen rather than a silent wrong guess. Nothing downstream runs until
 * `onConfirm` is called.
 */
export function MappingStep({
  headers,
  value,
  onChange,
  onConfirm,
}: {
  headers: string[];
  value: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Confirmá qué columna del archivo corresponde a cada campo.
      </p>
      <div className="space-y-3">
        {TARGET_FIELDS.map(({ field, label }) => (
          <div key={field} className="flex items-center gap-3">
            <label
              htmlFor={`map-${field}`}
              className="w-32 shrink-0 text-sm font-semibold"
            >
              {label}
            </label>
            <select
              id={`map-${field}`}
              value={value[field]}
              onChange={(e) => onChange({ ...value, [field]: e.target.value })}
              className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— sin mapear —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!value.title || !value.status}
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  );
}
