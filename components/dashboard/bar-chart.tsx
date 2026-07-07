"use client";

import type { DistributionEntry } from "./dashboard-stats";

/**
 * Accessible horizontal bar chart (#28), hand-rolled SVG over the design
 * tokens — no charting library, matching the project's existing pattern
 * (star rating, barcode scanner UI). Each bar carries a real SVG `<text>`
 * label and count so the distribution is readable (incl. by assistive tech)
 * without relying on bar length or color alone.
 */
const ROW_H = 28;
const LABEL_W = 92;
const VALUE_W = 30;
const GAP = 8;
const CHART_W = 320;
const BAR_W = CHART_W - LABEL_W - VALUE_W - GAP * 2;

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
  const height = data.length * ROW_H;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <svg
          role="img"
          aria-label={title}
          viewBox={`0 0 ${CHART_W} ${height}`}
          width="100%"
          height={height}
          className="text-foreground"
        >
          {data.map((d, i) => {
            const y = i * ROW_H;
            const barWidth = Math.max(2, (d.count / max) * BAR_W);
            const valueText = nf.format(d.count);
            return (
              <g key={d.key} transform={`translate(0, ${y})`}>
                <text
                  x={0}
                  y={ROW_H / 2}
                  dominantBaseline="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
                </text>
                <rect
                  x={LABEL_W}
                  y={(ROW_H - 14) / 2}
                  width={BAR_W}
                  height={14}
                  rx={4}
                  className="fill-muted"
                />
                <rect
                  x={LABEL_W}
                  y={(ROW_H - 14) / 2}
                  width={barWidth}
                  height={14}
                  rx={4}
                  className="fill-primary"
                />
                <text
                  x={LABEL_W + BAR_W + GAP}
                  y={ROW_H / 2}
                  dominantBaseline="middle"
                  className="fill-foreground text-[11px] font-bold tabular-nums"
                >
                  {valueText}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
