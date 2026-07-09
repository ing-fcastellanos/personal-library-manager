"use client";

import * as React from "react";
import { Loader2, Download, FileDown } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { Reader } from "@/lib/types/reader";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { ReadingEventCard } from "./reading-event-card";
import {
  ReadingFiltersBar,
  type ReaderDateFilters,
} from "./reading-filters-bar";
import { filterEvents } from "./history";
import { eventsToCsv } from "./goodreads";

/**
 * CSV export tab (#34, ADR-0005): a Goodreads/StoryGraph-importable download
 * of the reading log, filterable by reader and date range — the same fetch
 * and filter shape as `ReadingHistory` (#26), minus the rating filter this
 * screen doesn't need. Each row also carries the pending-to-publish toggle
 * (same PATCH as the history timeline) so a reader can triage what to
 * publish manually without switching tabs.
 */
export function ReadingExport() {
  const { reader } = useAuth();
  const [events, setEvents] = React.useState<ReadingEvent[] | null>(null);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [filters, setFilters] = React.useState<ReaderDateFilters>({});

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

  const filtered = React.useMemo(
    () => (events ? filterEvents(events, filters) : []),
    [events, filters],
  );

  async function togglePublishPending(event: ReadingEvent, next: boolean) {
    try {
      const res = await fetch(`/api/reading-events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publishPending: next }),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as ReadingEvent;
      setEvents((prev) =>
        prev ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev,
      );
    } catch {
      // Best-effort — the checkbox simply won't reflect the change if this fails.
    }
  }

  function download() {
    const csv = eventsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lecturas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (events === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReadingFiltersBar
          readers={readers}
          value={filters}
          onChange={setFilters}
        />
        <button
          type="button"
          onClick={download}
          disabled={filtered.length === 0}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden="true" />
          Descargar CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <FileDown className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold">
            No hay lecturas para exportar con esos filtros.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ev) => (
            <li key={ev.id}>
              <ReadingEventCard
                event={ev}
                readerName={readerName.get(ev.readerId)}
                editable={!!reader && ev.readerId === reader.id}
                goodreadsUrl={reader?.goodreadsUrl}
                onTogglePublishPending={(next) =>
                  togglePublishPending(ev, next)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
