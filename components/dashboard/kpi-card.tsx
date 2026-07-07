"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A single dashboard KPI (#27): icon + label + value. Values are formatted for
 * es-AR (thousands separators). Pass `loading` to render a skeleton in place of
 * the value. Reused across the KPI grid and by later M5 widgets.
 */
const nf = new Intl.NumberFormat("es-AR");

export function KpiCard({
  label,
  value,
  icon,
  loading = false,
  hint,
  className,
}: {
  label: string;
  value?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight">
          {nf.format(value ?? 0)}
        </p>
      )}
      {hint && !loading && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
