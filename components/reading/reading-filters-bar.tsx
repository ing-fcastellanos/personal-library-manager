"use client";

import type { Reader } from "@/lib/types/reader";
import type { HistoryFilters } from "./history";

/**
 * Shared reader + date-range filter controls (#34), extracted from
 * `reading-history.tsx` so the export tab can reuse the exact same
 * reader-select + from/to inputs without duplicating the JSX. Deliberately a
 * subset of `HistoryFilters` — the rating filter is Historial-only and stays
 * local to that component.
 */
export type ReaderDateFilters = Pick<
  HistoryFilters,
  "readerId" | "from" | "to"
>;

const inputClass =
  "h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring";

export function ReadingFiltersBar({
  readers,
  value,
  onChange,
}: {
  readers: Reader[];
  value: ReaderDateFilters;
  onChange: (next: ReaderDateFilters) => void;
}) {
  return (
    <>
      <select
        aria-label="Filtrar por lector"
        value={value.readerId ?? ""}
        onChange={(e) =>
          onChange({ ...value, readerId: e.target.value || undefined })
        }
        className={inputClass}
      >
        <option value="">Todos los lectores</option>
        {readers.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Desde"
        value={value.from ?? ""}
        onChange={(e) =>
          onChange({ ...value, from: e.target.value || undefined })
        }
        className={inputClass}
      />
      <input
        type="date"
        aria-label="Hasta"
        value={value.to ?? ""}
        onChange={(e) =>
          onChange({ ...value, to: e.target.value || undefined })
        }
        className={inputClass}
      />
    </>
  );
}
