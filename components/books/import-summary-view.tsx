"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  AlertTriangle,
  RotateCw,
  SquarePen,
  Undo2,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  groupOutcomes,
  markUndone,
  markRetried,
  type ImportOutcome,
  type ImportResult,
} from "./import-summary";

/**
 * AI import summary (#22). Renders the per-item outcomes of an AI add flow grouped
 * by result, with per-item actions: edit + undo (added), undo (copy), retry
 * (failed). Controlled — the parent (route) owns the outcome list and persists it
 * via `onChange` so the summary survives a reload and an edit round-trip.
 */
const META: Record<
  ImportResult,
  { icon: React.ReactNode; iconBg: string; iconFg: string; label: string }
> = {
  added: {
    icon: <Check className="size-[13px]" strokeWidth={2.4} />,
    iconBg: "bg-success-bg",
    iconFg: "text-success",
    label: "text-success",
  },
  added_as_copy: {
    icon: <Copy className="size-[13px]" strokeWidth={2.4} />,
    iconBg: "bg-accent",
    iconFg: "text-primary",
    label: "text-primary",
  },
  failed: {
    icon: <AlertTriangle className="size-[13px]" strokeWidth={2.4} />,
    iconBg: "bg-destructive/10",
    iconFg: "text-destructive",
    label: "text-destructive",
  },
  skipped_duplicate: {
    icon: <Copy className="size-[13px]" strokeWidth={2.4} />,
    iconBg: "bg-muted",
    iconFg: "text-muted-foreground",
    label: "text-muted-foreground",
  },
  discarded: {
    icon: <Undo2 className="size-[13px]" strokeWidth={2.4} />,
    iconBg: "bg-muted",
    iconFg: "text-muted-foreground",
    label: "text-muted-foreground",
  },
};

export function ImportSummary({
  outcomes,
  onChange,
}: {
  outcomes: ImportOutcome[];
  onChange: (next: ImportOutcome[]) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<number | null>(null);
  const groups = groupOutcomes(outcomes);

  async function undo(index: number) {
    const o = outcomes[index];
    setBusy(index);
    try {
      if (o.copyId) {
        const r = await fetch(`/api/copies/${o.copyId}`, { method: "DELETE" });
        if (!r.ok) throw new Error("copy");
      }
      if (o.result === "added" && o.bookId) {
        const r = await fetch(`/api/books/${o.bookId}`, { method: "DELETE" });
        if (!r.ok) throw new Error("book");
      }
      onChange(markUndone(outcomes, index));
    } catch {
      toast({ title: "No se pudo deshacer", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function retry(index: number) {
    const o = outcomes[index];
    if (!o.retry) return;
    setBusy(index);
    try {
      const res = await fetch("/api/books/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(o.retry.payload),
      });
      if (!res.ok) throw new Error("intake");
      const { book, copy } = (await res.json()) as {
        book: { id: string };
        copy?: { id: string };
      };
      onChange(
        markRetried(outcomes, index, { bookId: book.id, copyId: copy?.id }),
      );
    } catch {
      toast({ title: "No se pudo reintentar", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const total = outcomes.length;
  const addedCount = outcomes.filter(
    (o) => o.result === "added" || o.result === "added_as_copy",
  ).length;

  return (
    <div className="space-y-5">
      {/* summary header */}
      <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-4">
        <span className="grid size-12 shrink-0 animate-in place-items-center rounded-full bg-success-bg text-success zoom-in-90">
          <Check className="size-[26px]" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-tight">
            {addedCount} de {total} {total === 1 ? "agregado" : "agregados"}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Resumen de la importación.
          </p>
        </div>
      </div>

      {groups.map((group) => {
        const meta = META[group.result];
        return (
          <section key={group.result} className="space-y-2">
            {/* label row */}
            <div className="flex items-center gap-2 px-[3px]">
              <span
                className={cn(
                  "grid size-[22px] shrink-0 place-items-center rounded-[7px]",
                  meta.iconBg,
                  meta.iconFg,
                )}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              <span
                className={cn(
                  "text-[11.5px] font-bold uppercase tracking-[0.07em]",
                  meta.label,
                )}
              >
                {group.label}
              </span>
              <span className="text-[11.5px] font-semibold text-muted-foreground">
                · {group.items.length}
              </span>
            </div>

            {/* item rows — one divided card */}
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {group.items.map(({ outcome, index }, i) => (
                <li
                  key={index}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2.5",
                    i > 0 && "border-t",
                  )}
                >
                  <CoverThumb url={outcome.coverUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold leading-tight">
                      {outcome.title}
                    </p>
                    {outcome.author && (
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                        {outcome.author}
                      </p>
                    )}
                  </div>
                  {busy === index ? (
                    <span
                      role="status"
                      aria-label={`Procesando ${outcome.title}`}
                      className="grid size-11 shrink-0 place-items-center"
                    >
                      <Loader2
                        className="size-5 animate-spin text-primary"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {outcome.result === "added" && outcome.bookId && (
                        <Link
                          href={`/libros/${outcome.bookId}/editar`}
                          aria-label={`Editar ${outcome.title}`}
                          className="grid size-11 place-items-center rounded-[11px] border bg-card text-foreground transition-colors hover:bg-accent"
                        >
                          <SquarePen
                            className="size-[18px]"
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                      {(outcome.result === "added" ||
                        outcome.result === "added_as_copy") && (
                        <button
                          type="button"
                          onClick={() => undo(index)}
                          aria-label={`Deshacer ${outcome.title}`}
                          className="grid size-11 place-items-center rounded-[11px] border bg-card text-foreground transition-colors hover:bg-accent"
                        >
                          <Undo2 className="size-[18px]" aria-hidden="true" />
                        </button>
                      )}
                      {outcome.result === "failed" && (
                        <button
                          type="button"
                          onClick={() => retry(index)}
                          aria-label={`Reintentar ${outcome.title}`}
                          className="inline-flex h-11 items-center gap-1.5 rounded-[11px] border border-destructive/40 bg-destructive/10 px-3 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/15"
                        >
                          <RotateCw
                            className="size-[18px]"
                            aria-hidden="true"
                          />
                          Reintentar
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Link
        href="/catalogo"
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        <LayoutGrid className="size-[18px]" aria-hidden="true" />
        Ver catálogo
      </Link>
    </div>
  );
}

function CoverThumb({ url }: { url?: string | null }) {
  return (
    <span className="relative h-[50px] w-[34px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary to-accent shadow">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
      <span className="absolute inset-y-0 left-0 w-[2.5px] bg-black/15" />
    </span>
  );
}
