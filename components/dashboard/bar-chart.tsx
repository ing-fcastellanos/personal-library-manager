"use client";

import type { DistributionEntry } from "./dashboard-stats";

/**
 * Accessible horizontal bar chart (#28, Claude Design handoff): label and
 * count are real DOM text (readable and CSS-truncatable, per the handoff's
 * a11y notes); only the bar track/fill is SVG (`<rect>`, no charting
 * library), sized as a percentage of its row so it stays responsive. The
 * "Otros" bucket (see `topN` in dashboard-stats.ts) renders at reduced
 * opacity to read as an aggregate, not a peer category.
 */
const ROW_H = 28;

export function BarChart({
  title,
  data,
  emptyMessage = "Sin datos todavía.",
}: {
  title: string;
  data: DistributionEntry[];
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const nf = new Intl.NumberFormat("es-AR");

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold tracking-tight">{title}</h3>
      {data.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div role="group" aria-label={title} className="flex flex-col">
          {data.map((d) => {
            const pct = Math.max(3, Math.round((d.count / max) * 100));
            return (
              <div
                key={d.key}
                className="flex items-center gap-2.5"
                style={{ height: ROW_H }}
              >
                <div className="w-24 shrink-0 truncate text-xs text-foreground">
                  {d.label}
                </div>
                <div className="min-w-0 flex-1">
                  <svg
                    width="100%"
                    height={10}
                    aria-hidden="true"
                    className="block"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="100%"
                      height={10}
                      rx={5}
                      className="fill-muted"
                    />
                    <rect
                      x="0"
                      y="0"
                      width={`${pct}%`}
                      height={10}
                      rx={5}
                      className={
                        d.key === "otros" ? "fill-primary/40" : "fill-primary"
                      }
                    />
                  </svg>
                </div>
                <div className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-foreground">
                  {nf.format(d.count)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
