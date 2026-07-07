"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A single dashboard KPI (#27, Claude Design handoff): label + icon badge (top
 * right, accent-tinted) + a large bold value below. Values are formatted for
 * es-AR (thousands separators). Pass `loading` to render a skeleton in place of
 * the value (label/icon stay visible). Reused across the KPI grid and by later
 * M5 widgets.
 */
const nf = new Intl.NumberFormat("es-AR");

export function KpiCard({
  label,
  value,
  icon,
  loading = false,
  className,
}: {
  label: string;
  value?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              "grid size-[34px] shrink-0 place-items-center rounded-[11px]",
              loading
                ? "bg-muted text-muted-foreground"
                : "bg-accent/70 text-accent-foreground",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3.5 h-[26px] w-3/5" />
      ) : (
        <p className="mt-3.5 text-[26px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[30px]">
          {nf.format(value ?? 0)}
        </p>
      )}
    </div>
  );
}
