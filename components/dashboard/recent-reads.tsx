"use client";

import Link from "next/link";
import { History, ChevronRight } from "lucide-react";
import { ReadingEventCard } from "@/components/reading/reading-event-card";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { recentReads } from "./dashboard-stats";

/**
 * "Últimos leídos" (#29, Claude Design handoff): the 5 most recent finished
 * readings across both readers, reusing the #26 `ReadingEventCard` unmodified
 * (view-only — editing stays in `/leido`). Links to the full history. Data is
 * the dashboard's already-loaded `events`/`readers` — no new fetch.
 */
export function RecentReads({
  events,
  readers,
}: {
  events: ReadingEvent[];
  readers: Reader[];
}) {
  const readerName = new Map(readers.map((r) => [r.id, r.name]));
  const recent = recentReads(events);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Últimos leídos
        </h2>
        <Link
          href="/leido"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 text-[12.5px] font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver historial completo
          <ChevronRight className="size-[13px]" aria-hidden="true" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-[22px] py-8 text-center">
          <span className="grid size-12 place-items-center rounded-[14px] bg-muted text-muted-foreground">
            <History className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-3.5 text-sm font-semibold">
            Todavía no hay lecturas terminadas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((ev) => (
            <ReadingEventCard
              key={ev.id}
              event={ev}
              readerName={readerName.get(ev.readerId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
