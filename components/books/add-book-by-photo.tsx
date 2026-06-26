"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, AlertCircle, RotateCcw, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  candidateToBookData,
  fileToBase64,
  intakePayload,
  isLowConfidence,
  type IdentifyCandidate,
  type IdentifyResponse,
} from "./photo-add";
import type { BookData, ExistingBook, Shelf } from "./types";

/**
 * Add a book by photo (#20). Captures a cover/spine photo with the device camera,
 * sends it to `POST /api/ai/identify` (AI + server-side enrichment), and lets the
 * reader confirm the best candidate or pick an enrichment alternative before
 * saving. The captured photo becomes the cover, uploaded only on confirm (reusing
 * the cover endpoint, #15). Reuses duplicate pre-check (#16) and intake (#14).
 *
 * Functional baseline over the `ui` primitives; the Claude Design handoff refines
 * the visual flow.
 */
type Phase = "capture" | "analyzing" | "review" | "saving" | "error";

export function AddBookByPhoto() {
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

  function reset() {
    setPhase("capture");
    setPhoto(null);
    setResult(null);
    setBook(null);
    setDuplicate(null);
  }

  async function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setPhase("analyzing");
    try {
      const { base64, contentType } = await fileToBase64(file);
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
      setPhase("review");
    } catch {
      setPhase("error");
    }
  }

  function pickCandidate(c: IdentifyCandidate) {
    setBook(candidateToBookData(c));
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
    await fetch(`/api/books/${created.id}/cover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageBase64: photo!.base64,
        contentType: photo!.contentType,
      }),
    });
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

  // ---- render ----
  if (phase === "capture") {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground">
            <Camera className="size-8" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Sacá una foto del libro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Portada o lomo. La IA lo identifica y completás los datos.
            </p>
          </div>
          <Button asChild className="h-11 gap-2">
            <label>
              <Camera className="size-4" aria-hidden="true" />
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onCapture}
              />
            </label>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "analyzing") {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent
          className="flex flex-col items-center gap-3 p-8 text-center"
          role="status"
          aria-live="polite"
        >
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.dataUrl}
              alt=""
              className="h-40 w-auto rounded-xl object-cover"
            />
          )}
          <Loader2
            className="size-6 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">Analizando la foto…</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-7" aria-hidden="true" />
          </span>
          <p className="font-semibold">No se pudo identificar</p>
          <p className="text-sm text-muted-foreground">
            Probá con otra foto, mejor iluminada o más cerca del lomo.
          </p>
          <Button className="h-11 gap-2" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Sacar otra foto
          </Button>
        </CardContent>
      </Card>
    );
  }

  // review / saving
  const saving = phase === "saving";
  const lowConfidence = isLowConfidence(result?.aiConfidence ?? null);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.dataUrl}
            alt="Foto del libro (será la portada)"
            className="h-28 w-20 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          {lowConfidence && (
            <Badge
              variant="outline"
              className="mb-1 border-amber-500/40 text-amber-600"
            >
              Baja confianza — revisá los datos
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">
            La foto se guardará como portada. Confirmá o corregí los datos.
          </p>
        </div>
      </div>

      {duplicate && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
        >
          <p>
            Ya tenés <strong>«{duplicate.title}»</strong> ({duplicate.copies}{" "}
            {duplicate.copies === 1 ? "copia" : "copias"}). ¿Agregás una copia o
            creás otro libro?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={saving} onClick={addAsCopy}>
              Agregar como copia
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={saving}
              onClick={createAndCover}
            >
              Crear de todos modos
            </Button>
          </div>
        </div>
      )}

      <Card className="rounded-2xl shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="photo-title">Título</Label>
            <Input
              id="photo-title"
              value={book?.title ?? ""}
              onChange={(e) =>
                setBook((b) => (b ? { ...b, title: e.target.value } : b))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo-authors">Autor(es)</Label>
            <Input
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo-shelf">Estante</Label>
            <Select value={shelfId} onValueChange={setShelfId}>
              <SelectTrigger id="photo-shelf" className="h-11">
                <SelectValue placeholder="Sin estante" />
              </SelectTrigger>
              <SelectContent>
                {shelves.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {result && result.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            ¿Es alguno de estos?
          </p>
          {result.alternatives.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickCandidate(c)}
              className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {(c.authors ?? []).join(", ")}
                  {c.publishedYear ? ` · ${c.publishedYear}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="h-11 gap-2" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Otra foto
        </Button>
        <Button className="h-11 flex-1 gap-2" loading={saving} onClick={save}>
          <Check className="size-4" aria-hidden="true" />
          Guardar libro
        </Button>
      </div>
    </div>
  );
}
