"use client";

import * as React from "react";
import Link from "next/link";
import {
  Library,
  Layers,
  BookCheck,
  Hourglass,
  Users,
  Building2,
  BookPlus,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { KpiCard } from "./kpi-card";
import { computeKpis, type Kpis } from "./dashboard-stats";

/**
 * Library dashboard (#27): real KPI overview of the collection and reading state,
 * computed client-side from the existing list endpoints (no aggregation backend).
 * Loads once in parallel; degrades gracefully if a source fails.
 */
interface Sources {
  books: Book[];
  copies: Copy[];
  events: ReadingEvent[];
  readers: Reader[];
}

const nf = new Intl.NumberFormat("es-AR");

export function Dashboard() {
  const [data, setData] = React.useState<Sources | null>(null);

  React.useEffect(() => {
    let alive = true;
    const okJson = (r: Response) => (r.ok ? r.json() : null);
    const asArray = <T,>(v: unknown): T[] =>
      Array.isArray(v) ? (v as T[]) : [];
    Promise.all([
      fetch("/api/books").then(okJson),
      fetch("/api/copies").then(okJson),
      fetch("/api/reading-events").then(okJson),
      fetch("/api/readers").then(okJson),
    ])
      .then(([b, c, e, rd]) => {
        if (!alive) return;
        setData({
          books: asArray<Book>(b),
          copies: asArray<Copy>(c),
          events: asArray<ReadingEvent>(e),
          readers: asArray<Reader>(rd),
        });
      })
      .catch(
        () =>
          alive && setData({ books: [], copies: [], events: [], readers: [] }),
      );
    return () => {
      alive = false;
    };
  }, []);

  const kpis: Kpis | null = data
    ? computeKpis(data.books, data.copies, data.events, data.readers)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Un vistazo a tu biblioteca.</p>
      </div>

      {kpis === null ? (
        <LoadingGrid />
      ) : kpis.books === 0 ? (
        <EmptyState
          icon={<BookPlus />}
          title="Tu biblioteca está vacía"
          description="Agregá tu primer libro y acá van a aparecer tus indicadores."
          action={
            <Link
              href="/agregar"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <BookPlus className="size-4" aria-hidden="true" />
              Agregar libro
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Libros"
              value={kpis.books}
              icon={<Library className="size-[18px]" aria-hidden="true" />}
            />
            <KpiCard
              label="Ejemplares"
              value={kpis.copies}
              icon={<Layers className="size-[18px]" aria-hidden="true" />}
            />
            <KpiCard
              label="Leídos"
              value={kpis.read}
              icon={<BookCheck className="size-[18px]" aria-hidden="true" />}
            />
            <KpiCard
              label="Pendientes"
              value={kpis.pending}
              icon={<Hourglass className="size-[18px]" aria-hidden="true" />}
            />
            <KpiCard
              label="Autores"
              value={kpis.authors}
              icon={<Users className="size-[18px]" aria-hidden="true" />}
            />
            <KpiCard
              label="Editoriales"
              value={kpis.publishers}
              icon={<Building2 className="size-[18px]" aria-hidden="true" />}
            />
          </div>

          {kpis.perReader.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Leídos por lector
              </h2>
              <div className="overflow-hidden rounded-2xl border bg-card">
                {kpis.perReader.map((r, i) => (
                  <div
                    key={r.readerId}
                    className={
                      "flex items-center gap-3 p-3.5" +
                      (i < kpis.perReader.length - 1 ? " border-b" : "")
                    }
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback>
                        {r.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-semibold">
                      {r.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {nf.format(r.finished)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      leídos
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <KpiCard key={i} label="" loading />
      ))}
    </div>
  );
}
