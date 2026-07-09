"use client";

import * as React from "react";
import { Loader2, FileUp } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { parseCsv } from "./import/csv-parse";
import {
  detectFormat,
  defaultMapping,
  type ImportFormat,
  type ColumnMapping,
} from "./import/format";
import { filterFinishedRows } from "./import/mapping";
import { processRows, type ProcessedRow } from "./import/process";
import { persistRow } from "./import/persist";
import { MappingStep } from "./import/mapping-step";
import { ReviewList } from "./import/review-list";
import { ImportSummary } from "./import-summary-view";
import type { ImportOutcome } from "./import-summary";

type Phase =
  "upload" | "mapping" | "processing" | "review" | "saving" | "summary";

/**
 * CSV bootstrap-import wizard (#35): Goodreads/StoryGraph export → column
 * mapping → finished-only filter → enrich+dedupe (design D3/D4) → per-row
 * review (design D5/D6) → persist → the existing AI-flow summary screen
 * (design D8). Every `ReadingEvent` attributes to the active reader — no
 * separate picker step (design D7).
 */
export function AddBookByCsv() {
  const { reader } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("upload");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>(
    defaultMapping("unknown"),
  );
  const [processed, setProcessed] = React.useState<ProcessedRow[]>([]);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = React.useState<ImportOutcome[]>([]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await parseCsv(file);
      const detected: ImportFormat = detectFormat(parsed.headers);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(defaultMapping(detected));
      setPhase("mapping");
    } catch {
      toast({ title: "No se pudo leer el archivo", variant: "destructive" });
    }
  }

  async function onConfirmMapping() {
    const finished = filterFinishedRows(rows, mapping);
    setPhase("processing");
    setProgress({ done: 0, total: finished.length });
    const result = await processRows(finished, (done, total) =>
      setProgress({ done, total }),
    );
    setProcessed(result);
    setPhase("review");
  }

  async function onConfirmImport() {
    if (!reader) return;
    const included = processed.filter((r) => r.include);
    const excluded = processed.filter((r) => !r.include);
    setPhase("saving");
    setProgress({ done: 0, total: included.length });
    const out: ImportOutcome[] = excluded.map((r) => ({
      title: r.source.title,
      author: r.source.authors[0],
      coverUrl: r.candidate?.coverUrl ?? null,
      result: "discarded",
    }));
    for (let i = 0; i < included.length; i++) {
      out.push(await persistRow(included[i], reader.id));
      setProgress({ done: i + 1, total: included.length });
    }
    setOutcomes(out);
    setPhase("summary");
  }

  // ───────────────────────── upload ─────────────────────────
  if (phase === "upload") {
    return (
      <div className="flex flex-col items-center px-2 pt-2 text-center">
        <div className="flex aspect-[4/3] w-full max-w-[300px] flex-col items-center justify-center gap-3.5 rounded-[20px] border-2 border-dashed border-border bg-card p-6">
          <span className="grid size-[72px] place-items-center rounded-full bg-accent text-accent-foreground">
            <FileUp className="size-9" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <p className="text-lg font-bold tracking-tight">
            Importá tu CSV de Goodreads o StoryGraph
          </p>
          <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            Solo se importan las lecturas marcadas como leídas.
          </p>
        </div>
        <label className="mt-6 inline-flex h-[54px] w-full max-w-[300px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-primary text-base font-bold text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <FileUp className="size-5" aria-hidden="true" />
          Elegir archivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={onUpload}
          />
        </label>
      </div>
    );
  }

  // ───────────────────────── mapping ─────────────────────────
  if (phase === "mapping") {
    return (
      <MappingStep
        headers={headers}
        value={mapping}
        onChange={setMapping}
        onConfirm={onConfirmMapping}
      />
    );
  }

  // ───────────────────────── processing / saving ─────────────────────────
  if (phase === "processing" || phase === "saving") {
    const pct =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <p
          className="mt-4 text-[17px] font-bold"
          role="status"
          aria-live="polite"
        >
          {phase === "processing" ? "Procesando" : "Importando"} {progress.done}
          /{progress.total}
        </p>
        <div className="mt-5 w-full max-w-xs">
          <div
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label="Progreso de la importación"
            className="h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── review ─────────────────────────
  if (phase === "review") {
    const includedCount = processed.filter((r) => r.include).length;
    return (
      <div className="space-y-4">
        {processed.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No encontramos lecturas terminadas para importar en este archivo.
          </p>
        ) : (
          <>
            <ReviewList rows={processed} onChange={setProcessed} />
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={includedCount === 0}
              className="sticky bottom-0 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-50"
            >
              Importar {includedCount}{" "}
              {includedCount === 1 ? "lectura" : "lecturas"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ───────────────────────── summary ─────────────────────────
  return <ImportSummary outcomes={outcomes} onChange={setOutcomes} />;
}
