"use client";

import * as React from "react";
import Link from "next/link";
import { Book, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeriesDialog } from "@/components/series/series-dialog";
import { volumeCounts } from "@/services/series/views";
import type { Series } from "@/lib/types/series";

/**
 * `/ajustes/series` (#38): every tracked series with its completion, opening
 * the shared `SeriesDialog` for the picked row — the settings-index entry
 * point alongside the book detail (design D4).
 */
export function SeriesIndex() {
  const [series, setSeries] = React.useState<Series[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/series", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setSeries(Array.isArray(data) ? data : []);
    } catch {
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const open = series.find((s) => s.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Series</h1>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <EmptyState
          icon={<Book />}
          title="Todavía no armaste ninguna serie"
          description="Abrí el detalle de un libro de la saga y usá «Agregar a una serie» para empezar."
          action={
            <Button asChild variant="outline">
              <Link href="/catalogo">Ir al catálogo</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {series.map((s) => {
            const { owned, total } = volumeCounts(s);
            const complete = owned === total;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  aria-label={`Ver la serie «${s.name}»`}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg",
                      complete
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Book className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {complete
                        ? `Completa · ${total} ${total === 1 ? "tomo" : "tomos"}`
                        : `${owned} de ${total} ${total === 1 ? "tomo" : "tomos"}`}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/ajustes"
        className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-semibold text-primary hover:underline"
      >
        <ChevronLeft className="size-[15px]" aria-hidden="true" />
        Volver a Ajustes
      </Link>

      {open && (
        <SeriesDialog
          open={!!open}
          onOpenChange={(o) => !o && setOpenId(null)}
          series={open}
          onUpdated={(updated) =>
            setSeries((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
          }
        />
      )}
    </div>
  );
}
