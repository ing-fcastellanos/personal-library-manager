"use client";

import * as React from "react";
import { Loader2, History, FilterX } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { Reader } from "@/lib/types/reader";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { ReadingEventCard } from "./reading-event-card";
import { ConfirmReadingSheet } from "./confirm-reading-sheet";
import { filterEvents, type HistoryFilters } from "./history";
import type { MarkTarget } from "./mark-read";

/**
 * Global reading history timeline (#26): all `ReadingEvent`s newest-first from
 * `GET /reading-events` (denormalized snapshot — no joins), filterable by reader,
 * rating, and date range client-side. The active reader can edit their own entry
 * inline via the dual-mode `ConfirmReadingSheet`.
 */
export function ReadingHistory() {
  const { reader } = useAuth();
  const [events, setEvents] = React.useState<ReadingEvent[] | null>(null);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [filters, setFilters] = React.useState<HistoryFilters>({});
  const [editing, setEditing] = React.useState<ReadingEvent | null>(null);

  React.useEffect(() => {
    let alive = true;
    const okJson = (r: Response) => (r.ok ? r.json() : null);
    Promise.all([
      fetch("/api/reading-events").then(okJson),
      fetch("/api/readers").then(okJson),
    ])
      .then(([ev, rd]) => {
        if (!alive) return;
        setEvents(Array.isArray(ev) ? (ev as ReadingEvent[]) : []);
        setReaders(Array.isArray(rd) ? (rd as Reader[]) : []);
      })
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, []);

  const readerName = React.useMemo(() => {
    const m = new Map<string, string>();
    readers.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [readers]);

  const active =
    filters.readerId != null ||
    filters.rating != null ||
    !!filters.from ||
    !!filters.to;
  const filtered = events ? filterEvents(events, filters) : [];

  function onSaved(saved: ReadingEvent) {
    setEvents((prev) =>
      prev ? prev.map((e) => (e.id === saved.id ? saved : e)) : prev,
    );
  }

  if (events === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando historial…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <History className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-base font-bold">Todavía no hay lecturas</p>
        <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
          Registrá una lectura terminada y aparecerá acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filtrar por lector"
          value={filters.readerId ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, readerId: e.target.value || undefined }))
          }
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los lectores</option>
          {readers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por calificación"
          value={filters.rating ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              rating: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Cualquier calificación</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="Desde"
          value={filters.from ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, from: e.target.value || undefined }))
          }
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="date"
          aria-label="Hasta"
          value={filters.to ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, to: e.target.value || undefined }))
          }
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        />

        {active && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <FilterX className="size-4" aria-hidden="true" />
            Limpiar
          </button>
        )}
      </div>

      {/* results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <p className="text-sm font-semibold">
            No hay lecturas para esos filtros.
          </p>
          <button
            type="button"
            onClick={() => setFilters({})}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ev) => (
            <li key={ev.id}>
              <ReadingEventCard
                event={ev}
                readerName={readerName.get(ev.readerId)}
                editable={!!reader && ev.readerId === reader.id}
                onEdit={() => setEditing(ev)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ConfirmReadingSheet
          mode="edit"
          event={editing}
          reader={reader}
          target={eventTarget(editing)}
          onClose={() => setEditing(null)}
          onDone={onSaved}
        />
      )}
    </div>
  );
}

/** Builds the sheet target from an event's denormalized book snapshot. */
function eventTarget(ev: ReadingEvent): MarkTarget {
  return {
    id: ev.bookId,
    title: ev.bookTitle,
    authors: ev.bookAuthors,
    coverUrl: ev.coverUrl ?? null,
    isbn13: ev.isbn13 ?? null,
  };
}
