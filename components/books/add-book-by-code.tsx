"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Keyboard,
  Check,
  Copy,
  X,
  Loader2,
  CameraOff,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createIsbnScanner } from "@/lib/barcode/isbn-scanner";
import { toIsbn13 } from "@/services/enrichment/normalize";
import { candidateToBookData, type IdentifyCandidate } from "./photo-add";
import { duplicatesUrl, shelfIntakePayload } from "./shelf-add";
import { saveImport, type ImportOutcome } from "./import-summary";
import type { Shelf } from "./types";

/**
 * Add books by scanning their ISBN barcode (#23). A live camera decodes the
 * EAN-13; each valid ISBN pauses the loop, resolves via the existing enrichment
 * (`/api/enrich?isbn=`) + duplicate check, and shows a confirm card. Confirming
 * saves via intake to the batch shelf and resumes scanning; the session
 * accumulates outcomes and ends on the shared import summary (#22). A manual ISBN
 * input is both the no-barcode path and the camera-denied fallback.
 */

interface DupMatch {
  book: { id: string; title: string; authors: string[] };
  existingCopies: number;
}

interface Detail {
  isbn: string;
  candidate: IdentifyCandidate | null;
  duplicate: { id: string; title: string; copies: number } | null;
}

type Cam = "starting" | "live" | "denied";

export function AddBookByCode() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const scannerRef = React.useRef<ReturnType<typeof createIsbnScanner> | null>(
    null,
  );
  // Ignore repeat decodes while a card is open or of the same in-frame code.
  const handlingRef = React.useRef(false);
  const lastIsbnRef = React.useRef<string | null>(null);
  const outcomesRef = React.useRef<ImportOutcome[]>([]);

  const [cam, setCam] = React.useState<Cam>("starting");
  const [shelfId, setShelfId] = React.useState("");
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [count, setCount] = React.useState(0);
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) =>
        setShelves(d.map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => setShelves([]));
  }, []);

  // ── resolve an ISBN → enrichment + duplicate → confirm card ──────────────
  const resolve = React.useCallback(
    async (isbn: string) => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      lastIsbnRef.current = isbn;
      setBusy(true);
      try {
        const enrich = await fetch(
          `/api/enrich?isbn=${encodeURIComponent(isbn)}`,
        ).then((r) => r.json());
        const candidate =
          (enrich.candidate as IdentifyCandidate | null) ?? null;
        const idFor = candidate ?? { title: "", authors: [], isbn13: isbn };
        const dupRes = await fetch(
          duplicatesUrl({
            isbn13: isbn,
            title: idFor.title,
            authors: idFor.authors ?? [],
          }),
        ).then((r) => r.json());
        const m = (dupRes.matches as DupMatch[] | undefined)?.[0];
        setDetail({
          isbn,
          candidate,
          duplicate: m
            ? { id: m.book.id, title: m.book.title, copies: m.existingCopies }
            : null,
        });
      } catch {
        toast({
          title: "No se pudo consultar el ISBN",
          variant: "destructive",
        });
        handlingRef.current = false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  // Latest `resolve` without making the camera effect depend on it (it would
  // otherwise re-acquire the camera on every render).
  const resolveRef = React.useRef(resolve);
  React.useEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  // ── camera lifecycle (mount + retry only) ────────────────────────────────
  React.useEffect(() => {
    const scanner = createIsbnScanner();
    scannerRef.current = scanner;
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;
    setCam("starting");
    scanner
      .start(video, (isbn) => {
        // A card is open, or the same code is still in frame → ignore.
        if (handlingRef.current || isbn === lastIsbnRef.current) return;
        void resolveRef.current(isbn);
      })
      .then(() => {
        if (!cancelled) setCam("live");
      })
      .catch(() => {
        if (!cancelled) setCam("denied");
      });
    return () => {
      cancelled = true;
      scanner.stop();
    };
  }, [retryKey]);

  function resume() {
    setDetail(null);
    handlingRef.current = false;
  }

  function discard() {
    // Keep lastIsbnRef so the same in-frame code is not re-opened immediately.
    resume();
  }

  function record(outcome: ImportOutcome) {
    outcomesRef.current.push(outcome);
    setCount(outcomesRef.current.length);
  }

  async function add() {
    if (!detail?.candidate) return;
    const c = detail.candidate;
    setBusy(true);
    try {
      const res = await fetch("/api/books/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          shelfIntakePayload(
            candidateToBookData(c),
            shelfId,
            c.coverUrl ?? null,
          ),
        ),
      });
      if (!res.ok) throw new Error("intake");
      const { book, copy } = (await res.json()) as {
        book: { id: string };
        copy?: { id: string };
      };
      record({
        title: c.title,
        author: c.authors?.[0],
        coverUrl: c.coverUrl ?? null,
        result: "added",
        bookId: book.id,
        copyId: copy?.id,
      });
      resume();
    } catch {
      toast({ title: "No se pudo agregar", variant: "destructive" });
      setBusy(false);
    }
  }

  async function addCopy() {
    if (!detail?.duplicate) return;
    const d = detail.duplicate;
    setBusy(true);
    try {
      const res = await fetch("/api/copies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookId: d.id, shelfId: shelfId || null }),
      });
      if (!res.ok) throw new Error("copy");
      const created = (await res.json()) as { id?: string };
      record({
        title: detail.candidate?.title ?? d.title,
        author: detail.candidate?.authors?.[0],
        coverUrl: detail.candidate?.coverUrl ?? null,
        result: "added_as_copy",
        copyId: created.id,
      });
      resume();
    } catch {
      toast({ title: "No se pudo agregar la copia", variant: "destructive" });
      setBusy(false);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const isbn = toIsbn13(manual);
    if (!isbn) {
      toast({ title: "ISBN inválido", variant: "destructive" });
      return;
    }
    setManual("");
    lastIsbnRef.current = null;
    void resolve(isbn);
  }

  function finish() {
    if (!outcomesRef.current.length) {
      router.push("/agregar");
      return;
    }
    scannerRef.current?.stop();
    saveImport(outcomesRef.current);
    router.push("/agregar/resumen");
  }

  return (
    <div className="space-y-4">
      <ShelfPicker shelves={shelves} value={shelfId} onChange={setShelfId} />

      {/* camera viewport */}
      <div className="relative overflow-hidden rounded-2xl border bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-[3/4] w-full object-cover"
        />
        {cam === "live" && !detail && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-24 w-[70%] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {cam === "starting" && (
          <div className="absolute inset-0 grid place-items-center text-white/80">
            <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          </div>
        )}
        {cam === "denied" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-white/85">
            <div>
              <CameraOff className="mx-auto size-8" aria-hidden="true" />
              <p className="mt-2 text-sm">
                Sin acceso a la cámara. Ingresá el ISBN a mano.
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="mt-3 rounded-lg border border-white/40 px-3 py-1.5 text-[13px] font-semibold hover:bg-white/10"
              >
                Reintentar cámara
              </button>
            </div>
          </div>
        )}
        {cam === "live" && !detail && (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-center text-[13px] font-medium text-white">
            Apuntá al código de barras
          </p>
        )}
      </div>

      {/* manual ISBN entry (also the camera fallback) */}
      <form onSubmit={submitManual} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard
            className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ISBN a mano"
            aria-label="ISBN a mano"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-accent"
        >
          Buscar
        </button>
      </form>

      {/* running count + finish */}
      <button
        type="button"
        onClick={finish}
        className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        <Barcode className="size-[18px]" aria-hidden="true" />
        {count > 0 ? `Terminar · ${count} agregados` : "Terminar"}
      </button>

      {detail && (
        <ConfirmCard
          detail={detail}
          busy={busy}
          onAdd={add}
          onAddCopy={addCopy}
          onDiscard={discard}
        />
      )}
    </div>
  );
}

function ConfirmCard({
  detail,
  busy,
  onAdd,
  onAddCopy,
  onDiscard,
}: {
  detail: Detail;
  busy: boolean;
  onAdd: () => void;
  onAddCopy: () => void;
  onDiscard: () => void;
}) {
  const { candidate, duplicate } = detail;
  return (
    <div
      role="dialog"
      aria-label="Confirmar libro"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl border-t bg-card p-4 shadow-2xl animate-in slide-in-from-bottom"
    >
      {candidate ? (
        <div className="flex items-center gap-3">
          <CoverThumb url={candidate.coverUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight">
              {candidate.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {candidate.authors?.[0] ?? ""}
            </p>
            {duplicate && (
              <p className="mt-1 text-[11px] font-semibold text-primary">
                Ya lo tenés · {duplicate.copies}{" "}
                {duplicate.copies === 1 ? "copia" : "copias"}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No encontramos metadata para el ISBN{" "}
          <span className="font-semibold text-foreground">{detail.isbn}</span>.
          Cargalo desde «Manual».
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-card font-semibold hover:bg-accent disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
          Descartar
        </button>
        {candidate &&
          (duplicate ? (
            <button
              type="button"
              onClick={onAddCopy}
              disabled={busy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              Agregar copia
            </button>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={busy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Agregar
            </button>
          ))}
      </div>
    </div>
  );
}

function CoverThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}

const SHELF_SVG = "M3 7v13h18V7M3 7l3-4h12l3 4M3 7h18";

function ShelfPicker({
  shelves,
  value,
  onChange,
}: {
  shelves: Shelf[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="shelf-code" className="block text-[13px] font-semibold">
        Estante para todo el lote
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={SHELF_SVG} />
        </svg>
        <select
          id="shelf-code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-10 text-[15px] font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sin estante</option>
          {shelves.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
