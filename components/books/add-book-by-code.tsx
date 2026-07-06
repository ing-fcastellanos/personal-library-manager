"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Keyboard,
  Check,
  Copy,
  X,
  Plus,
  Loader2,
  CameraOff,
  ChevronDown,
  RotateCcw,
  Search,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="space-y-3.5">
      <ShelfPicker shelves={shelves} value={shelfId} onChange={setShelfId} />

      {/* camera viewport (3:4) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#14110d] shadow-lg">
        <video
          ref={videoRef}
          muted
          playsInline
          className="size-full object-cover"
        />

        {cam === "starting" && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          </div>
        )}

        {cam === "live" && (
          <>
            {/* running counter */}
            {count > 0 && (
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur">
                <span className="grid size-4 place-items-center rounded-full bg-success text-[9px] font-extrabold text-white">
                  {count}
                </span>
                agregados
              </div>
            )}

            {/* aim guide (decorative) */}
            {!detail && (
              <div
                aria-hidden="true"
                className="absolute inset-x-[12%] top-[40%] h-[110px] -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(10,8,5,0.28)]"
              >
                <div className="absolute inset-0 rounded-2xl border-2 border-white/85" />
                <span className="absolute -left-0.5 -top-0.5 size-[22px] rounded-tl-2xl border-l-4 border-t-4 border-white" />
                <span className="absolute -right-0.5 -top-0.5 size-[22px] rounded-tr-2xl border-r-4 border-t-4 border-white" />
                <span className="absolute -bottom-0.5 -left-0.5 size-[22px] rounded-bl-2xl border-b-4 border-l-4 border-white" />
                <span className="absolute -bottom-0.5 -right-0.5 size-[22px] rounded-br-2xl border-b-4 border-r-4 border-white" />
                <div className="absolute inset-x-2 h-0.5 animate-scanline rounded-full bg-gradient-to-r from-transparent via-warning to-transparent shadow-[0_0_10px_1px_rgba(244,181,107,0.7)]" />
              </div>
            )}

            {/* hint */}
            {!detail && (
              <div className="absolute inset-x-0 bottom-4 text-center">
                <span className="inline-block rounded-full bg-black/60 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur">
                  Apuntá al código de barras
                </span>
              </div>
            )}

            {/* confirm bottom sheet */}
            {detail && (
              <ConfirmSheet
                detail={detail}
                busy={busy}
                onAdd={add}
                onAddCopy={addCopy}
                onDiscard={discard}
              />
            )}
          </>
        )}

        {cam === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#211d18] px-6 text-center text-white/90">
            <span className="grid size-16 place-items-center rounded-full bg-white/10">
              <CameraOff className="size-[30px]" aria-hidden="true" />
            </span>
            <p className="mt-4 max-w-[250px] text-[15px] font-bold leading-snug">
              Sin acceso a la cámara. Ingresá el ISBN a mano.
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 px-4 text-[13.5px] font-semibold hover:bg-white/10"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar cámara
            </button>
          </div>
        )}
      </div>

      {/* manual ISBN entry (also the camera fallback) */}
      <form onSubmit={submitManual} className="space-y-1.5">
        <label htmlFor="code-isbn" className="block text-[13px] font-semibold">
          ISBN a mano
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="code-isbn"
              inputMode="numeric"
              autoComplete="off"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="978…"
              className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-[15px] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-4 text-[14.5px] font-bold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Search className="size-4" aria-hidden="true" />
            Buscar
          </button>
        </div>
        {cam === "denied" && (
          <p className="text-xs leading-snug text-muted-foreground">
            Con la cámara sin permiso, esta es la vía para seguir cargando.
          </p>
        )}
      </form>

      {/* finish → import summary */}
      <button
        type="button"
        onClick={finish}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        <Check className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
        {count > 0 ? `Terminar · ${count} agregados` : "Terminar"}
      </button>
    </div>
  );
}

/** Bottom sheet inside the viewport: detected / duplicate / not-found. */
function ConfirmSheet({
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
      className="absolute inset-x-0 bottom-0 rounded-t-[20px] bg-card p-4 text-card-foreground shadow-2xl animate-in slide-in-from-bottom"
    >
      <span
        className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-border"
        aria-hidden="true"
      />

      {candidate ? (
        <>
          {duplicate && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-[11.5px] font-bold text-warning">
              <Copy className="size-3" aria-hidden="true" />
              Ya lo tenés · {duplicate.copies}{" "}
              {duplicate.copies === 1 ? "copia" : "copias"}
            </span>
          )}
          <div className="flex items-center gap-3">
            <CoverThumb url={candidate.coverUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight">
                {candidate.title}
              </p>
              <p className="truncate text-[13px] text-muted-foreground">
                {candidate.authors?.[0] ?? ""}
              </p>
              <p className="mt-1.5 text-[11.5px] tabular-nums text-muted-foreground">
                ISBN {detail.isbn}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <SearchX className="size-[22px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug">
              No encontramos metadata para el ISBN
            </p>
            <p className="mt-1 text-[12.5px] tabular-nums text-muted-foreground">
              {detail.isbn}
            </p>
          </div>
        </div>
      )}

      {!candidate && (
        <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Podés cargarlo a mano desde{" "}
          <span className="font-semibold text-foreground">«Manual»</span> con
          título y autores.
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className={cn(
            "inline-flex h-[50px] items-center justify-center gap-1.5 rounded-[14px] border font-semibold hover:bg-accent disabled:opacity-50",
            candidate ? "px-5" : "flex-1",
          )}
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
              className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary font-bold text-primary-foreground disabled:opacity-50"
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
              className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" strokeWidth={2.4} aria-hidden="true" />
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
