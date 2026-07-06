"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Camera,
  SearchX,
  ChevronRight,
  Plus,
  BookX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import {
  prepareImage,
  type IdentifyResponse,
} from "@/components/books/photo-add";
import { duplicatesUrl } from "@/components/books/shelf-add";
import type { Book } from "@/lib/types/book";
import { ConfirmReadingSheet } from "./confirm-reading-sheet";
import {
  matchToLibrary,
  type DuplicateMatch,
  type MarkTarget,
} from "./mark-read";

/**
 * Dedicated "marcar como leído" flow (#24, Claude Design handoff). The reader
 * finds a library book by **searching the catalog** (reuses `GET /api/catalog/search`)
 * or **identifying it from a photo** (reuses `POST /api/ai/identify`), then confirms
 * via the shared ConfirmReadingSheet (which owns the success state). Only books
 * already in the library can be marked; a photo match that isn't in the library
 * links out to `/agregar`.
 */
type Method = "search" | "photo";
type PhotoPhase = "idle" | "analyzing" | "not-found";

export function MarkAsRead() {
  const { reader } = useAuth();
  const [method, setMethod] = React.useState<Method>("search");
  const [target, setTarget] = React.useState<MarkTarget | null>(null);

  return (
    <div className="space-y-4">
      {/* method selector (two horizontal cells, mirrors Agregar) */}
      <div
        role="radiogroup"
        aria-label="Cómo encontrar el libro"
        className="grid grid-cols-2 gap-2"
      >
        <MethodTab
          active={method === "search"}
          onClick={() => setMethod("search")}
          icon={<Search className="size-[19px]" aria-hidden="true" />}
          label="Buscar"
        />
        <MethodTab
          active={method === "photo"}
          onClick={() => setMethod("photo")}
          icon={<Camera className="size-[19px]" aria-hidden="true" />}
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
          onDone={() => {}}
          onClose={() => setTarget(null)}
          onMarkAnother={() => {
            setTarget(null);
            setMethod("search");
          }}
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
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
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
        <div>
          <div
            role="status"
            className="flex items-center gap-2.5 px-0.5 py-2 text-[13.5px] font-semibold text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className="size-[18px] animate-spin rounded-full border-[2.4px] border-border border-t-primary"
            />
            Buscando…
          </div>
          <div className="mt-1.5 flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="h-14 w-10 shrink-0 animate-pulse rounded-md bg-muted" />
                <div className="flex-1">
                  <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-2.5 w-2/5 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX
              className="size-[26px]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <p className="mt-4 max-w-[250px] text-sm font-semibold leading-relaxed">
            No encontramos libros en tu biblioteca para esa búsqueda.
          </p>
        </div>
      )}

      {!loading && items && items.length > 0 && (
        <ul className="flex flex-col">
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
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <CoverThumb url={b.coverUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold leading-tight">
                    {b.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                    {(b.authors ?? []).join(", ")}
                  </span>
                </span>
                <ChevronRight
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
      <div className="flex flex-col items-center rounded-[20px] border bg-card px-5 py-7">
        <div className="relative h-[150px] w-[120px] overflow-hidden rounded-xl bg-gradient-to-br from-[#4a4033] to-[#2b2418]">
          <div className="absolute inset-[12%] rounded bg-gradient-to-br from-[#e9e2d2] to-[#cfc5ae]" />
        </div>
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-center gap-2.5 text-[14.5px] font-semibold"
        >
          <span
            aria-hidden="true"
            className="size-[19px] animate-spin rounded-full border-[2.6px] border-border border-t-primary"
          />
          Identificando el libro…
        </div>
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <span className="grid size-[60px] place-items-center rounded-2xl bg-warning-bg text-warning">
          <BookX className="size-7" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <p className="mt-[18px] text-[17px] font-bold">
          No está en tu biblioteca
        </p>
        <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
          Solo podés marcar como leídos libros que ya tenés cargados.
        </p>
        <Link
          href="/agregar"
          className="mt-[22px] inline-flex h-[50px] w-full max-w-[280px] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          Agregar libro
        </Link>
        <label className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 p-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
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
    );
  }

  return (
    <div className="flex flex-col">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-border bg-card px-5 py-[34px] text-center transition-colors hover:border-primary hover:bg-accent">
        <span className="grid size-[68px] place-items-center rounded-full bg-accent text-accent-foreground">
          <Camera className="size-8" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="mt-1.5 text-base font-bold">Tomar foto</span>
        <span className="max-w-[230px] text-[12.5px] leading-relaxed text-muted-foreground">
          La IA lo identifica y lo busca en tu biblioteca.
        </span>
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
        "flex h-[54px] items-center justify-center gap-2 rounded-xl border-[1.5px] text-sm transition-colors",
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
    <span className="relative h-[58px] w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
      <span
        className="absolute inset-y-0 left-0 w-[2.5px] bg-black/15"
        aria-hidden="true"
      />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
