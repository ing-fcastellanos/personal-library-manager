"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Camera,
  Loader2,
  SearchX,
  BookCheck,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import {
  prepareImage,
  type IdentifyResponse,
} from "@/components/books/photo-add";
import { duplicatesUrl } from "@/components/books/shelf-add";
import type { Book } from "@/lib/types/book";
import type { ReadingEvent } from "@/lib/types/reading-event";
import { ConfirmReadingSheet } from "./confirm-reading-sheet";
import {
  matchToLibrary,
  type DuplicateMatch,
  type MarkTarget,
} from "./mark-read";

/**
 * Dedicated "marcar como leído" flow (#24). The reader finds a library book by
 * **searching the catalog** (reuses `GET /api/catalog/search`) or **identifying it
 * from a photo** (reuses `POST /api/ai/identify`), then confirms via the shared
 * ConfirmReadingSheet. Only books already in the library can be marked; a photo
 * match that isn't in the library links out to `/agregar`.
 */
type Method = "search" | "photo";
type PhotoPhase = "idle" | "analyzing" | "not-found";

export function MarkAsRead() {
  const { reader } = useAuth();
  const [method, setMethod] = React.useState<Method>("search");
  const [target, setTarget] = React.useState<MarkTarget | null>(null);
  const [done, setDone] = React.useState<ReadingEvent | null>(null);

  function onDone(event: ReadingEvent) {
    setTarget(null);
    setDone(event);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success/15 text-success">
          <BookCheck className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-4 text-lg font-bold">¡Lectura registrada!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          «{done.bookTitle}» quedó marcado como leído.
        </p>
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => setDone(null)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <BookCheck className="size-4" aria-hidden="true" />
            Marcar otro
          </button>
          <Link
            href={`/libros/${done.bookId}`}
            className="inline-flex h-11 items-center rounded-xl border px-4 text-sm font-semibold hover:bg-accent"
          >
            Ver libro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* method selector */}
      <div
        role="radiogroup"
        aria-label="Cómo encontrar el libro"
        className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3.5"
      >
        <MethodTab
          active={method === "search"}
          onClick={() => setMethod("search")}
          icon={<Search className="size-[22px]" aria-hidden="true" />}
          label="Buscar"
        />
        <MethodTab
          active={method === "photo"}
          onClick={() => setMethod("photo")}
          icon={<Camera className="size-[22px]" aria-hidden="true" />}
          label="Por foto"
        />
      </div>

      {method === "search" ? (
        <SearchFinder reader={reader} onPick={setTarget} />
      ) : (
        <PhotoFinder onPick={setTarget} />
      )}

      {target && (
        <ConfirmReadingSheet
          target={target}
          reader={reader}
          onDone={onDone}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────── search ─────────────────────────
function SearchFinder({
  reader,
  onPick,
}: {
  reader: { id: string } | null;
  onPick: (t: MarkTarget) => void;
}) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<Book[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const term = q.trim();
    let alive = true;
    // Debounce inside a timer so the setState calls run in a callback (not
    // synchronously in the effect body) — required by react-hooks/set-state-in-effect.
    const t = setTimeout(() => {
      if (term.length < 2) {
        if (alive) setItems(null);
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({ q: term, limit: "20" });
      if (reader) params.set("reader", reader.id);
      fetch(`/api/catalog/search?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { items?: Book[] } | null) => {
          if (!alive) return;
          setItems(Array.isArray(d?.items) ? d!.items : []);
        })
        .catch(() => alive && setItems([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, reader]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscá por título o autor"
          aria-label="Buscar en el catálogo"
          className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Buscando…
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No encontramos libros en tu biblioteca para esa búsqueda.
        </p>
      )}

      {!loading && items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    id: b.id,
                    title: b.title,
                    authors: b.authors ?? [],
                    coverUrl: b.coverUrl ?? null,
                    isbn13: b.isbn13 ?? null,
                  })
                }
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition-colors hover:border-ring"
              >
                <CoverThumb url={b.coverUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {b.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                    {(b.authors ?? []).join(", ")}
                  </span>
                </span>
                <BookCheck
                  className="size-[18px] shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── photo ─────────────────────────
function PhotoFinder({ onPick }: { onPick: (t: MarkTarget) => void }) {
  const [phase, setPhase] = React.useState<PhotoPhase>("idle");

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("analyzing");
    try {
      const { base64, contentType } = await prepareImage(file);
      const res = await fetch("/api/ai/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, contentType }),
      });
      if (!res.ok) throw new Error("identify failed");
      const data = (await res.json()) as IdentifyResponse;
      const best = data.best;
      if (!best) {
        setPhase("not-found");
        return;
      }
      // Resolve the identified book to one already in the library.
      const dupRes = await fetch(
        duplicatesUrl({
          isbn13: best.isbn13 ?? null,
          title: best.title,
          authors: best.authors ?? [],
        }),
      ).then((r) => (r.ok ? r.json() : null));
      const match = matchToLibrary(
        (dupRes?.matches as DuplicateMatch[] | undefined) ?? undefined,
      );
      if (match) {
        setPhase("idle");
        onPick(match);
      } else {
        setPhase("not-found");
      }
    } catch {
      setPhase("not-found");
    }
  }

  if (phase === "analyzing") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-2.5 py-10 text-center"
      >
        <Loader2
          className="size-6 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">Identificando el libro…</span>
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="flex flex-col items-center px-3 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-base font-bold">No está en tu biblioteca</p>
        <p className="mt-1 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
          Solo podés marcar como leídos libros que ya tenés cargados. Agregalo
          primero y después marcalo.
        </p>
        <div className="mt-5 flex gap-2.5">
          <Link
            href="/agregar"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar libro
          </Link>
          <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold hover:bg-accent">
            <Camera className="size-4" aria-hidden="true" />
            Otra foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onCapture}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-2 pt-2 text-center">
      <div className="flex aspect-[4/3] w-full max-w-[300px] flex-col items-center justify-center gap-3.5 rounded-[20px] border-2 border-dashed border-border bg-card p-6">
        <span className="grid size-[72px] place-items-center rounded-full bg-accent text-accent-foreground">
          <Camera className="size-8" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <p className="text-lg font-bold tracking-tight">
          Sacá una foto del libro
        </p>
        <p className="max-w-[230px] text-sm leading-relaxed text-muted-foreground">
          La IA lo identifica y lo busca en tu biblioteca.
        </p>
      </div>
      <label className="mt-6 inline-flex h-[54px] w-full max-w-[300px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-primary text-base font-bold text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <Camera className="size-5" aria-hidden="true" />
        Tomar foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onCapture}
        />
      </label>
    </div>
  );
}

function MethodTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] p-3 text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-accent font-bold text-accent-foreground"
          : "border-border bg-card font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CoverThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
