"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  Loader2,
  Info,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  candidateToBookData,
  prepareImage,
  intakePayload,
  isLowConfidence,
  type IdentifyCandidate,
  type IdentifyResponse,
} from "./photo-add";
import type { BookData, ExistingBook, Shelf } from "./types";

/**
 * Add a book by photo (#20, Claude Design handoff "Add by Photo"). Captures a
 * cover/spine photo, sends it to `POST /api/ai/identify` (AI + server-side
 * enrichment), and lets the reader confirm the best candidate or pick an
 * enrichment alternative before saving. The captured photo becomes the cover,
 * uploaded only on confirm (reusing the cover endpoint, #15). Reuses duplicate
 * pre-check (#16) and intake (#14). Recreated from the design over the existing
 * tokens.
 */
type Phase = "capture" | "analyzing" | "review" | "saving" | "error";

export function AddBookByPhoto({ onManual }: { onManual?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("capture");
  const [photo, setPhoto] = React.useState<{
    dataUrl: string;
    base64: string;
    contentType: string;
  } | null>(null);
  const [result, setResult] = React.useState<IdentifyResponse | null>(null);
  const [book, setBook] = React.useState<BookData | null>(null);
  const [selectedAlt, setSelectedAlt] = React.useState<number | null>(null);
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [shelfId, setShelfId] = React.useState<string>("");
  const [duplicate, setDuplicate] = React.useState<ExistingBook | null>(null);

  React.useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((d: { id: string; name: string }[]) =>
        setShelves(d.map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => setShelves([]));
  }, []);

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("analyzing");
    try {
      const { base64, contentType } = await prepareImage(file);
      setPhoto({
        dataUrl: `data:${contentType};base64,${base64}`,
        base64,
        contentType,
      });
      const res = await fetch("/api/ai/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, contentType }),
      });
      if (!res.ok) throw new Error(`identify failed: ${res.status}`);
      const data = (await res.json()) as IdentifyResponse;
      setResult(data);
      setBook(data.best ? candidateToBookData(data.best) : null);
      setSelectedAlt(null);
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  function pickAlternative(c: IdentifyCandidate, i: number) {
    setBook(candidateToBookData(c));
    setSelectedAlt(i);
    setDuplicate(null);
  }

  async function checkDuplicate(b: BookData): Promise<ExistingBook | null> {
    const qs = new URLSearchParams();
    if (b.isbn13?.trim()) qs.set("isbn", b.isbn13.trim());
    if (b.title.trim()) qs.set("title", b.title.trim());
    b.authors.forEach((a) => qs.append("authors", a));
    const res = await fetch(`/api/books/duplicates?${qs.toString()}`);
    if (!res.ok) return null;
    const { matches } = (await res.json()) as {
      matches: {
        book: { id: string; title: string; authors: string[] };
        existingCopies: number;
      }[];
    };
    const m = matches[0];
    return m
      ? {
          id: m.book.id,
          title: m.book.title,
          authors: m.book.authors,
          copies: m.existingCopies,
        }
      : null;
  }

  async function save() {
    if (!book || !photo) return;
    if (!book.title.trim()) {
      toast({ title: "Falta el título", variant: "destructive" });
      return;
    }
    setPhase("saving");
    try {
      const dup = await checkDuplicate(book);
      if (dup) {
        setDuplicate(dup);
        setPhase("review");
        return;
      }
      await createAndCover();
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
      setPhase("review");
    }
  }

  /** Intake the new book, then upload the captured photo as its cover (#15). */
  async function createAndCover() {
    const res = await fetch("/api/books/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(intakePayload(book!, { shelfId })),
    });
    if (!res.ok) throw new Error("intake failed");
    const { book: created } = (await res.json()) as { book: { id: string } };
    // Best-effort: the book is already saved; a failed cover upload shouldn't
    // block navigation, but warn so it isn't silently lost.
    const coverRes = await fetch(`/api/books/${created.id}/cover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageBase64: photo!.base64,
        contentType: photo!.contentType,
      }),
    });
    if (!coverRes.ok) {
      toast({
        title: "Se guardó el libro, pero no se pudo subir la portada",
        variant: "destructive",
      });
    }
    router.push(`/libros/${created.id}`);
  }

  async function addAsCopy() {
    if (!duplicate) return;
    setPhase("saving");
    try {
      const res = await fetch("/api/copies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookId: duplicate.id,
          shelfId: shelfId || null,
        }),
      });
      if (!res.ok) throw new Error("copy failed");
      router.push(`/libros/${duplicate.id}`);
    } catch {
      toast({ title: "No se pudo agregar la copia", variant: "destructive" });
      setPhase("review");
    }
  }

  // ───────────────────────── capture ─────────────────────────
  if (phase === "capture") {
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
            Funciona con la tapa o el lomo. La IA lo identifica solo.
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
        <p className="mt-3 text-xs text-muted-foreground">
          Se abre la cámara del dispositivo.
        </p>
      </div>
    );
  }

  // ───────────────────────── analyzing ─────────────────────────
  if (phase === "analyzing") {
    return (
      <div className="flex flex-col items-center px-2 py-6 text-center">
        <div className="relative w-[170px] overflow-hidden rounded-2xl shadow-xl">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.dataUrl}
              alt=""
              className="aspect-[2/3] w-full object-cover"
            />
          )}
          {/* scanning sweep */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[30%] animate-scan bg-gradient-to-b from-primary/55 to-transparent"
          />
        </div>
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center gap-2.5"
        >
          <Loader2
            className="size-5 animate-spin text-primary"
            aria-hidden="true"
          />
          <span className="text-base font-semibold">Analizando la foto…</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Identificando el libro y buscando su metadata.
        </p>
      </div>
    );
  }

  // ───────────────────────── error ─────────────────────────
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center px-3 py-8 text-center">
        <span className="grid size-[70px] place-items-center rounded-full bg-destructive/15 text-destructive">
          <CameraOff className="size-8" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="mt-5 text-lg font-bold">
          No pudimos identificar el libro
        </p>
        <p className="mt-2 max-w-[250px] text-sm leading-relaxed text-muted-foreground">
          La foto salió borrosa o el motor no está disponible. Probá con más luz
          o enfocando la tapa.
        </p>
        <label className="mt-6 inline-flex h-[50px] w-full max-w-[280px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
          <Camera className="size-[18px]" aria-hidden="true" />
          Sacar otra foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onCapture}
          />
        </label>
        {onManual && (
          <button
            type="button"
            onClick={onManual}
            className="mt-2.5 p-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cargar manualmente
          </button>
        )}
      </div>
    );
  }

  // ───────────────────────── review / saving ─────────────────────────
  const saving = phase === "saving";
  const lowConf = isLowConfidence(result?.aiConfidence ?? null);
  const alternatives = result?.alternatives ?? [];

  return (
    <div className="space-y-4">
      {lowConf && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-warning/40 bg-warning-bg p-2.5"
        >
          <Info className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="text-xs font-semibold text-warning">
            Baja confianza — revisá los datos
          </span>
        </div>
      )}

      {/* captured photo = cover */}
      <div className="flex gap-3.5">
        <div className="relative h-[130px] w-[88px] shrink-0 overflow-hidden rounded-xl shadow-lg">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.dataUrl}
              alt="Foto del libro (será la portada)"
              className="size-full object-cover"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-foreground/50 py-1 text-center text-[8px] font-semibold text-white">
            Tu foto
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Portada
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            La foto se guardará como portada.
          </p>
          <label className="mt-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 self-start rounded-lg border px-2.5 text-xs font-semibold hover:bg-accent">
            <Camera className="size-3.5" aria-hidden="true" />
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

      {/* editable form */}
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="photo-title">Título</Label>
          <input
            id="photo-title"
            value={book?.title ?? ""}
            onChange={(e) =>
              setBook((b) => (b ? { ...b, title: e.target.value } : b))
            }
            className="h-[46px] w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="photo-authors">Autor(es)</Label>
          <input
            id="photo-authors"
            value={(book?.authors ?? []).join(", ")}
            placeholder="Separados por coma"
            onChange={(e) =>
              setBook((b) =>
                b
                  ? {
                      ...b,
                      authors: e.target.value
                        .split(",")
                        .map((a) => a.trim())
                        .filter(Boolean),
                    }
                  : b,
              )
            }
            className="h-[46px] w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="photo-shelf">Estante</Label>
          <div className="relative">
            <select
              id="photo-shelf"
              value={shelfId}
              onChange={(e) => setShelfId(e.target.value)}
              className="h-[46px] w-full appearance-none rounded-lg border border-input bg-card px-3 pr-10 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      </div>

      {/* alternatives */}
      {alternatives.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">¿Es alguno de estos?</p>
            {lowConf && (
              <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10.5px] font-semibold text-warning">
                Revisá
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {alternatives.map((c, i) => {
              const active = selectedAlt === i;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickAlternative(c, i)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-[1.5px] p-2.5 text-left transition-colors hover:border-ring",
                    active
                      ? "border-primary bg-accent"
                      : "border-border bg-card",
                  )}
                >
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
                    {c.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.coverUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {c.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                      {(c.authors ?? []).join(", ")}
                      {c.publishedYear ? ` · ${c.publishedYear}` : ""}
                    </span>
                  </span>
                  {active && (
                    <Check
                      className="size-[18px] shrink-0 text-primary"
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* duplicate inline alert */}
      {duplicate && (
        <div
          role="alert"
          className="rounded-2xl border border-primary/35 bg-accent p-3.5"
        >
          <div className="flex gap-2.5">
            <Info
              className="mt-px size-[19px] shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-[13px] leading-relaxed">
              Ya tenés{" "}
              <strong className="font-bold">«{duplicate.title}»</strong> (
              {duplicate.copies} {duplicate.copies === 1 ? "copia" : "copias"})
              en tu biblioteca.
            </p>
          </div>
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={addAsCopy}
              className="h-11 flex-1 rounded-lg bg-primary text-[13.5px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              Agregar como copia
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={createAndCover}
              className="h-11 flex-1 rounded-lg border bg-card text-[13.5px] font-semibold hover:bg-background disabled:opacity-60"
            >
              Crear de todos modos
            </button>
          </div>
        </div>
      )}

      {/* action bar */}
      <div className="flex gap-2.5 border-t pt-3">
        <label className="inline-flex h-[50px] cursor-pointer items-center gap-1.5 rounded-2xl border px-4 text-sm font-semibold hover:bg-accent">
          Otra foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onCapture}
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          Guardar libro
        </button>
      </div>
    </div>
  );
}
