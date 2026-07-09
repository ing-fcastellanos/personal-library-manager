"use client";

import * as React from "react";
import { Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const isEmpty = filtered.length === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Filtros
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadingFiltersBar
            readers={readers}
            value={filters}
            onChange={setFilters}
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={download}
          disabled={isEmpty}
          aria-disabled={isEmpty}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-colors",
            isEmpty
              ? "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-75"
              : "bg-primary text-primary-foreground hover:brightness-[1.06]",
          )}
        >
          <Download className="size-[18px]" aria-hidden="true" />
          Descargar CSV
        </button>
        {!isEmpty && (
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            Formato compatible con Goodreads y StoryGraph · {filtered.length}{" "}
            lecturas
          </p>
        )}
      </div>

      <div className="border-t" />

      {isEmpty ? (
        <div className="flex items-center justify-center px-4 py-10 text-center">
          <div className="max-w-[280px] rounded-2xl border border-dashed bg-muted px-5 py-6">
            <p className="text-sm font-semibold text-muted-foreground">
              No hay lecturas para exportar con esos filtros.
            </p>
          </div>
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
