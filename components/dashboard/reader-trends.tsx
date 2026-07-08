"use client";

import type * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Flame, Clock } from "lucide-react";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { readerTrend } from "./dashboard-stats";

const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * Per-reader time trends (#29, Claude Design handoff): libros/mes, racha
 * actual/récord, ritmo (días entre lecturas) — all-time, computed client-side
 * from the dashboard's already-loaded `events`. Both readers render side by
 * side (stacked on narrow viewports) so they're directly comparable; a reader
 * with no finished readings still appears, with "—" placeholders and a "sin
 * lecturas" badge.
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
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
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
  const hasReadings = trend.finished > 0;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>
            {reader.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-[15.5px] font-bold">{reader.name}</span>
        {!hasReadings && (
          <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
            sin lecturas
          </span>
        )}
      </div>
      <div className="flex gap-2.5">
        <Stat
          icon={<Calendar className="size-[17px]" aria-hidden="true" />}
          label="Libros/mes"
          value={
            trend.booksPerMonth != null ? nf1.format(trend.booksPerMonth) : "—"
          }
        />
        <Stat
          icon={<Flame className="size-[17px]" aria-hidden="true" />}
          label="Racha"
          value={hasReadings ? String(trend.currentStreak) : "—"}
          hint={
            trend.longestStreak > trend.currentStreak
              ? `récord ${trend.longestStreak}`
              : undefined
          }
        />
        <Stat
          icon={<Clock className="size-[17px]" aria-hidden="true" />}
          label="Ritmo"
          value={
            trend.avgDaysBetween != null
              ? `${nf0.format(trend.avgDaysBetween)}d`
              : "—"
          }
        />
      </div>
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
  const empty = value === "—";
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border bg-background px-1.5 py-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span
        className={
          empty
            ? "text-[22px] font-extrabold leading-none tracking-tight text-muted-foreground"
            : "text-[22px] font-extrabold leading-none tracking-tight tabular-nums"
        }
      >
        {value}
      </span>
      <span className="text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
      {hint && (
        <span className="rounded-full bg-muted px-1.5 py-px text-[9.5px] font-semibold text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
