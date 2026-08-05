"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityRow } from "@/components/audit/activity-row";
import type { AuditLogEntry } from "@/lib/types/audit-log";
import type { Reader } from "@/lib/types/reader";

const LIMIT = 200;

async function listOrEmpty<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/** Pulses the silhouette of an `ActivityRow` so nothing jumps once it loads. */
function RowSkeleton() {
  return (
    <div className="flex items-start gap-2.5 border-b border-border py-3 last:border-b-0">
      <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-2/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * `/ajustes/actividad` (#40, Claude Design handoff "Actividad.dc.html"): the
 * most recent audit entries across every entity, most recent first — one
 * mixed feed, no per-type tabs or actor filter (two readers is small enough
 * that one feed reads like household news, not a log to search). A settings
 * sub-page (same shape as `/ajustes/series`), not a bottom-nav destination.
 */
export function ActivityFeed() {
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    Promise.all([
      listOrEmpty<AuditLogEntry>(`/api/audit-log?limit=${LIMIT}`),
      listOrEmpty<Reader>("/api/readers"),
    ]).then(([e, r]) => {
      if (!alive) return;
      setEntries(e);
      setReaders(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const readerName = (id: string) =>
    readers.find((r) => r.id === id)?.name ?? "Alguien";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Actividad</h1>

      {loading ? (
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-1">
          <EmptyState
            icon={<History />}
            title="Todavía no hay actividad registrada"
            description="Cada vez que alguien agregue, edite o borre un libro, ejemplar o lectura, va a aparecer acá."
          />
          <p className="text-center text-xs text-muted-foreground">
            Todo empieza desde el detalle de un libro.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            Últimas {entries.length} novedades del hogar
          </p>
          <ul className="flex flex-col">
            {entries.map((e) => (
              <ActivityRow
                key={e.id}
                entry={e}
                readerName={readerName(e.readerId)}
              />
            ))}
          </ul>
          <p className="text-center text-xs text-muted-foreground">
            Se guardan las últimas {LIMIT} novedades.
          </p>
        </>
      )}

      <Link
        href="/ajustes"
        className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-semibold text-primary hover:underline"
      >
        <ChevronLeft className="size-[15px]" aria-hidden="true" />
        Volver a Ajustes
      </Link>
    </div>
  );
}
