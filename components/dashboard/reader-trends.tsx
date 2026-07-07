"use client";

import type * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flame, BookOpen, Clock } from "lucide-react";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { readerTrend } from "./dashboard-stats";

const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * Per-reader time trends (#29): libros/mes, racha actual/récord, ritmo (días
 * entre lecturas) — all-time, computed client-side from the dashboard's
 * already-loaded `events`. Both readers render side by side (stacked on
 * narrow viewports) so they're directly comparable; a reader with no finished
 * readings still appears, with "—" placeholders.
 */
export function ReaderTrends({
  events,
  readers,
}: {
  events: ReadingEvent[];
  readers: Reader[];
}) {
  if (readers.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Tendencias
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {readers.map((r) => (
          <TrendCard key={r.id} reader={r} trend={readerTrend(events, r.id)} />
        ))}
      </div>
    </section>
  );
}

function TrendCard({
  reader,
  trend,
}: {
  reader: Reader;
  trend: ReturnType<typeof readerTrend>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback>
            {reader.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-bold">{reader.name}</span>
      </div>
      <dl className="mt-3.5 grid grid-cols-3 gap-2">
        <Stat
          icon={<BookOpen className="size-[15px]" aria-hidden="true" />}
          label="Libros/mes"
          value={
            trend.booksPerMonth != null ? nf1.format(trend.booksPerMonth) : "—"
          }
        />
        <Stat
          icon={<Flame className="size-[15px]" aria-hidden="true" />}
          label="Racha"
          value={String(trend.currentStreak)}
          hint={
            trend.longestStreak > trend.currentStreak
              ? `récord ${trend.longestStreak}`
              : undefined
          }
        />
        <Stat
          icon={<Clock className="size-[15px]" aria-hidden="true" />}
          label="Ritmo"
          value={
            trend.avgDaysBetween != null
              ? `${nf0.format(trend.avgDaysBetween)}d`
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted px-2 py-2.5 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-base font-bold tabular-nums leading-none">
        {value}
      </span>
      <span className="text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      {hint && <span className="text-[9px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
