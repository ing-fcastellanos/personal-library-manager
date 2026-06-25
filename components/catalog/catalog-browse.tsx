"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  List,
  LayoutGrid,
  SearchX,
  BookPlus,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useShelf } from "@/components/shelf/shelf-context";
import { CoverPreview } from "@/components/books/enrich-skeleton";
import type { Book } from "@/lib/types/book";

/**
 * Catalog browse (#17, Claude Design handoff "Catalog & Book Detail"). Search +
 * facet filters + list/grid results from `GET /api/catalog/search`, each linking
 * to the book detail. Filters are a fixed panel at md+ and a bottom-sheet on
 * mobile. Recreated from the design prototype over the existing `ui` primitives.
 */

interface FacetValue {
  value: string;
  label: string;
  count: number;
}
interface Facets {
  categories: FacetValue[];
  authors: FacetValue[];
  publishers: FacetValue[];
  shelves: FacetValue[];
}
interface SearchResult {
  items: Book[];
  total: number;
  page: number;
  facets: Facets;
}

const LIMIT = 24;
const SORTS = [
  { value: "title", label: "Título A–Z" },
  { value: "year", label: "Año" },
  { value: "author", label: "Autor" },
  { value: "addedAt", label: "Recientes" },
];
const STATUSES = [
  { value: "reading", label: "Leyendo" },
  { value: "finished", label: "Leído" },
  { value: "abandoned", label: "Abandonado" },
];

type Filters = {
  category: string;
  author: string;
  publisher: string;
  shelf: string;
  status: string;
};
const EMPTY_FILTERS: Filters = {
  category: "",
  author: "",
  publisher: "",
  shelf: "",
  status: "",
};

export function CatalogBrowse() {
  const { reader } = useAuth();
  const { shelf: scanShelf } = useShelf();
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [scanApplied, setScanApplied] = React.useState(false);
  const [sort, setSort] = React.useState("title");
  const [view, setView] = React.useState<"list" | "grid">("grid");
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filters.category) params.set("category", filters.category);
    if (filters.author) params.set("author", filters.author);
    if (filters.publisher) params.set("publisher", filters.publisher);
    if (filters.shelf) params.set("shelf", filters.shelf);
    if (filters.status) {
      params.set("status", filters.status);
      if (reader) params.set("reader", reader.id);
    }
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/catalog/search?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<SearchResult>)
        .then(setResult)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, filters, sort, page, reader]);

  const facets = result?.facets;
  // Preselect the shelf carried from a QR scan once it's a known shelf (#18 D5).
  // Render-time state adjustment (guarded), not an effect, to avoid a re-render loop.
  if (
    !scanApplied &&
    scanShelf &&
    !filters.shelf &&
    facets?.shelves.some((s) => s.value === scanShelf)
  ) {
    setScanApplied(true);
    setFilters((f) => ({ ...f, shelf: scanShelf }));
  }

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const activeCount =
    (q.trim() ? 1 : 0) + Object.values(filters).filter(Boolean).length;

  function setFilter(key: keyof Filters, value: string) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: f[key] === value ? "" : value }));
  }
  function clearAll() {
    setQ("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  const filterPanel = (
    <FilterPanel
      facets={facets}
      filters={filters}
      onToggle={setFilter}
      statusReaderMissing={!!filters.status && !reader}
    />
  );

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-7">
      {/* Filters: fixed panel at md+ */}
      <aside className="hidden md:block md:w-64 md:shrink-0">
        {filterPanel}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Search + controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar"
              placeholder="Buscar por título, autor o ISBN"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              className="h-10 pl-9"
            />
          </div>
          {/* Mobile filters trigger */}
          <Button
            variant="outline"
            className="gap-2 md:hidden"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filtros
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Ordenar" className="h-10 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex overflow-hidden rounded-lg border">
            <button
              aria-label="Vista lista"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "grid size-10 place-items-center",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <List className="size-4" />
            </button>
            <button
              aria-label="Vista grid"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "grid size-10 place-items-center border-l",
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>

        {/* Result meta */}
        {total > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {total} {total === 1 ? "libro" : "libros"}
            </p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <X className="size-3" />
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Results / states */}
        {loading && !result ? (
          <ResultsSkeleton view={view} />
        ) : total === 0 && activeCount > 0 ? (
          <NoResults onClear={clearAll} />
        ) : total === 0 ? (
          <EmptyState
            icon={<BookPlus />}
            title="Tu biblioteca está vacía"
            description="Todavía no agregaste libros."
            action={
              <Button asChild>
                <Link href="/agregar">Agregar libro</Link>
              </Button>
            }
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result!.items.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {result!.items.map((b) => (
              <BookRow key={b.id} book={b} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              aria-label="Anterior"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pages}
              aria-label="Siguiente"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile filters bottom-sheet */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          {filterPanel}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={clearAll}>
              Limpiar
            </Button>
            <Button onClick={() => setSheetOpen(false)}>
              Ver {total} {total === 1 ? "libro" : "libros"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterPanel({
  facets,
  filters,
  onToggle,
  statusReaderMissing,
}: {
  facets?: Facets;
  filters: Filters;
  onToggle: (key: keyof Filters, value: string) => void;
  statusReaderMissing: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <FacetGroup
        name="Categoría"
        selected={filters.category}
        values={facets?.categories}
        onToggle={(v) => onToggle("category", v)}
      />
      <FacetGroup
        name="Autor"
        selected={filters.author}
        values={facets?.authors}
        onToggle={(v) => onToggle("author", v)}
      />
      <FacetGroup
        name="Editorial"
        selected={filters.publisher}
        values={facets?.publishers}
        onToggle={(v) => onToggle("publisher", v)}
      />
      <FacetGroup
        name="Estante"
        selected={filters.shelf}
        values={facets?.shelves}
        onToggle={(v) => onToggle("shelf", v)}
      />
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Estado de lectura
        </p>
        <Select
          value={filters.status || "__any__"}
          onValueChange={(v) => onToggle("status", v === "__any__" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Cualquiera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any__">Cualquiera</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusReaderMissing && (
          <p className="mt-1 text-xs text-muted-foreground">
            Inicia sesión para filtrar por tu estado de lectura.
          </p>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  name,
  selected,
  values,
  onToggle,
}: {
  name: string;
  selected: string;
  values?: FacetValue[];
  onToggle: (value: string) => void;
}) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {name}
      </p>
      <div className="flex flex-col">
        {values.map((f) => {
          const on = selected === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onToggle(f.value)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                on && "font-semibold text-primary",
              )}
            >
              <span className="truncate">{f.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {f.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/libros/${book.id}`}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CoverPreview
        url={book.coverUrl ?? undefined}
        title={book.title}
        className="aspect-[2/3] h-auto w-full"
      />
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
        {book.title}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {book.authors.join(", ")}
        {book.publishedYear ? ` · ${book.publishedYear}` : ""}
      </p>
      {(book.categories ?? []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {book.categories.slice(0, 2).map((c) => (
            <Badge key={c} variant="secondary" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}

function BookRow({ book }: { book: Book }) {
  return (
    <Link
      href={`/libros/${book.id}`}
      className="flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors hover:border-ring"
    >
      <CoverPreview
        url={book.coverUrl ?? undefined}
        title={book.title}
        className="h-16 w-11 shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{book.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {book.authors.join(", ")}
          {book.publishedYear ? ` · ${book.publishedYear}` : ""}
        </p>
        {(book.categories ?? []).length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {book.categories.slice(0, 2).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function ResultsSkeleton({ view }: { view: "list" | "grid" }) {
  if (view === "list") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-16 w-11 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-1.5 h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold">Sin coincidencias</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        No encontramos libros con esos filtros. Probá ajustar la búsqueda o
        quitar algún filtro.
      </p>
      <Button variant="outline" className="mt-5 gap-2" onClick={onClear}>
        <X className="size-4" />
        Limpiar filtros
      </Button>
    </div>
  );
}
