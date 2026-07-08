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
  BookOpen,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import { KpiCard } from "./kpi-card";
import { RecentReads } from "./recent-reads";
import { ReaderTrends } from "./reader-trends";
import { BarChart } from "./bar-chart";
import {
  computeKpis,
  booksByCategory,
  booksByAuthor,
  booksByPublisher,
  readingsByCategory,
  type Kpis,
  type PerReaderStat,
} from "./dashboard-stats";

/**
 * Library dashboard (#27, Claude Design handoff): real KPI overview of the
 * collection and reading state, computed client-side from the existing list
 * endpoints (no aggregation backend). Loads once in parallel; degrades
 * gracefully if a source fails.
 */
interface Sources {
  books: Book[];
  copies: Copy[];
  events: ReadingEvent[];
  readers: Reader[];
}

const nf = new Intl.NumberFormat("es-AR");

/** Cycled avatar tints for the per-reader list, matching the handoff variety. */
const AVATAR_TINTS = [
  "bg-accent text-accent-foreground",
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
] as const;

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
        <KpiGrid loading />
      ) : kpis.books === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="space-y-6">
          <KpiGrid kpis={kpis} />
          {kpis.perReader.length > 0 && (
            <PerReaderList perReader={kpis.perReader} />
          )}
          <Composicion books={data!.books} events={data!.events} />
          <RecentReads events={data!.events} readers={data!.readers} />
          <ReaderTrends events={data!.events} readers={data!.readers} />
        </div>
      )}
    </div>
  );
}

function Composicion({
  books,
  events,
}: {
  books: Book[];
  events: ReadingEvent[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Composición
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <BarChart title="Libros por categoría" data={booksByCategory(books)} />
        <BarChart title="Libros por autor" data={booksByAuthor(books)} />
        <BarChart title="Libros por editorial" data={booksByPublisher(books)} />
        <BarChart
          title="Lecturas por categoría"
          data={readingsByCategory(books, events)}
          emptyMessage="Todavía no hay lecturas terminadas."
        />
      </div>
    </section>
  );
}

function KpiGrid({ kpis, loading }: { kpis?: Kpis; loading?: boolean }) {
  return (
    <div
      role={loading ? "status" : undefined}
      aria-label={loading ? "Cargando indicadores" : undefined}
      className="grid grid-cols-2 gap-2.5 sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]"
    >
      <KpiCard
        label="Libros"
        value={kpis?.books}
        loading={loading}
        icon={<Library className="size-[18px]" aria-hidden="true" />}
      />
      <KpiCard
        label="Ejemplares"
        value={kpis?.copies}
        loading={loading}
        icon={<Layers className="size-[18px]" aria-hidden="true" />}
      />
      <KpiCard
        label="Leídos"
        value={kpis?.read}
        loading={loading}
        icon={<BookCheck className="size-[18px]" aria-hidden="true" />}
      />
      <KpiCard
        label="Pendientes"
        value={kpis?.pending}
        loading={loading}
        icon={<Hourglass className="size-[18px]" aria-hidden="true" />}
      />
      <KpiCard
        label="Autores"
        value={kpis?.authors}
        loading={loading}
        icon={<Users className="size-[18px]" aria-hidden="true" />}
      />
      <KpiCard
        label="Editoriales"
        value={kpis?.publishers}
        loading={loading}
        icon={<Building2 className="size-[18px]" aria-hidden="true" />}
      />
    </div>
  );
}

function PerReaderList({ perReader }: { perReader: PerReaderStat[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Leídos por lector
      </h2>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {perReader.map((r, i) => (
          <div
            key={r.readerId}
            className={cn(
              "flex min-h-11 items-center gap-3 px-4 py-3",
              i < perReader.length - 1 && "border-b",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-[38px] shrink-0 place-items-center rounded-full text-[13px] font-bold",
                AVATAR_TINTS[i % AVATAR_TINTS.length],
              )}
            >
              {r.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 truncate text-[14.5px] font-semibold">
              {r.name}
            </span>
            <div className="shrink-0 text-right">
              <p className="text-base font-bold leading-none tracking-tight tabular-nums">
                {nf.format(r.finished)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">leídos</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-[66px] place-items-center rounded-[20px] bg-accent text-accent-foreground">
        <BookOpen
          className="size-[30px]"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </span>
      <p className="mt-5 text-[19px] font-extrabold tracking-tight">
        Tu biblioteca está vacía
      </p>
      <p className="mt-2 max-w-[260px] text-[13.5px] leading-relaxed text-muted-foreground">
        Agregá tu primer libro y acá van a aparecer tus indicadores.
      </p>
      <Link
        href="/agregar"
        className="mt-6 inline-flex h-[50px] items-center gap-2 rounded-2xl bg-primary px-6 text-[15px] font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
        Agregar libro
      </Link>
    </div>
  );
}
