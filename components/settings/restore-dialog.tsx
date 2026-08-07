"use client";

import * as React from "react";
import { Loader2, Upload, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchBackup } from "./backup";
import {
  parseBackupFile,
  entityCounts,
  snapshotFromBackup,
  type EntityCounts,
} from "./restore";
import {
  runCreate,
  runCleanup,
  createTotal,
  cleanupTotal,
  filterBackupForRetry,
  mergeRetryOutcomes,
} from "./restore-run";
import {
  groupRestoreOutcomes,
  creationSucceeded,
  ENTITY_LABEL,
  type RestoreOutcome,
} from "./restore-summary";
import type { Backup } from "./backup";
import type { CleanupSnapshot } from "./restore";
import type { RestoreIdMap } from "./restore-run";

type Phase = "upload" | "invalid" | "confirm" | "running" | "summary";

const COUNT_LABELS: { key: keyof EntityCounts; label: string }[] = [
  { key: "books", label: "Libros" },
  { key: "copies", label: "Ejemplares" },
  { key: "readingEvents", label: "Lecturas" },
  { key: "readers", label: "Lectores" },
  { key: "shelves", label: "Estantes" },
  { key: "wishlistItems", label: "Deseos" },
  { key: "loans", label: "Préstamos" },
  { key: "series", label: "Series" },
];

/**
 * "Restaurar backup" (#93, design.md): validates the uploaded file, previews
 * impact, creates everything first (data stays intact if this fails), and
 * only deletes the pre-restore snapshot once creation succeeds in full.
 */
export function RestoreDialog() {
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("upload");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [backup, setBackup] = React.useState<Backup | null>(null);
  const [current, setCurrent] = React.useState<Backup | null>(null);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = React.useState<RestoreOutcome[]>([]);
  const [idMap, setIdMap] = React.useState<RestoreIdMap | null>(null);
  const [snapshot, setSnapshot] = React.useState<CleanupSnapshot | null>(null);
  const [cleaned, setCleaned] = React.useState(false);

  function reset() {
    setPhase("upload");
    setErrors([]);
    setBackup(null);
    setCurrent(null);
    setProgress({ done: 0, total: 0 });
    setOutcomes([]);
    setIdMap(null);
    setSnapshot(null);
    setCleaned(false);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setErrors(["El archivo no es un JSON válido."]);
      setPhase("invalid");
      return;
    }
    const parsed = parseBackupFile(json);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setPhase("invalid");
      return;
    }
    const existing = await fetchBackup();
    setBackup(parsed.backup);
    setCurrent(existing);
    setPhase("confirm");
  }

  async function onConfirm() {
    if (!backup || !current) return;
    const currentSnapshot = snapshotFromBackup(current);
    setSnapshot(currentSnapshot);
    setPhase("running");
    setProgress({ done: 0, total: createTotal(backup) });
    const result = await runCreate(backup, (done, total) =>
      setProgress({ done, total }),
    );
    setIdMap(result.idMap);
    await afterCreate(result.outcomes, currentSnapshot);
  }

  // `cleanupSnapshot` is passed explicitly rather than read from the
  // `snapshot` state — this function can run synchronously after a
  // `setSnapshot` call in the same event handler (`onConfirm`), before that
  // state update has been applied, so reading `snapshot` here would see a
  // stale (often `null`) value and skip cleanup even on full success.
  async function afterCreate(
    runOutcomes: RestoreOutcome[],
    cleanupSnapshot: CleanupSnapshot | null,
  ) {
    setOutcomes(runOutcomes);
    if (creationSucceeded(runOutcomes) && cleanupSnapshot) {
      setProgress({ done: 0, total: cleanupTotal(cleanupSnapshot) });
      const cleanupOutcomes = await runCleanup(cleanupSnapshot, (done, total) =>
        setProgress({ done, total }),
      );
      setOutcomes([...runOutcomes, ...cleanupOutcomes]);
      setCleaned(true);
    }
    setPhase("summary");
  }

  async function onRetryFailed() {
    if (!backup || !idMap) return;
    const retryBackup = filterBackupForRetry(backup, outcomes);
    setPhase("running");
    const total = createTotal(retryBackup);
    setProgress({ done: 0, total });
    const result = await runCreate(
      retryBackup,
      (done, doneTotal) => setProgress({ done, total: doneTotal }),
      idMap,
    );
    setIdMap(result.idMap);
    const merged = mergeRetryOutcomes(outcomes, result.outcomes);
    await afterCreate(merged, snapshot);
  }

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const groups = groupRestoreOutcomes(outcomes);
  const hasFailures = outcomes.some((o) => o.result === "failed");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 size-4" aria-hidden="true" />
          Restaurar backup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {phase === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Restaurar desde un backup</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Elegí el archivo JSON que descargaste con «Backup». Nada se
              modifica todavía en este paso.
            </p>
            <label className="mt-2 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
              <Upload className="size-4" aria-hidden="true" />
              Elegir archivo
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={onUpload}
              />
            </label>
          </>
        )}

        {phase === "invalid" && (
          <>
            <DialogHeader>
              <DialogTitle>Ese archivo no es un backup válido</DialogTitle>
            </DialogHeader>
            <div
              role="alert"
              className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs"
            >
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase("upload")}>
                Elegir otro archivo
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "confirm" && backup && current && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar restauración</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Se va a reemplazar lo que tenés
              hoy por el contenido del backup.
            </p>
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div className="w-full space-y-1">
                <div className="grid grid-cols-3 gap-x-2 text-xs font-semibold text-muted-foreground">
                  <span></span>
                  <span>Hoy</span>
                  <span>Backup</span>
                </div>
                {COUNT_LABELS.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-3 gap-x-2 text-sm">
                    <span>{label}</span>
                    <span>{entityCounts(current)[key]}</span>
                    <span>{entityCounts(backup)[key]}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase("upload")}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={onConfirm}>
                Restaurar
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "running" && (
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
              Restaurando {progress.done}/{progress.total}
            </p>
            <div className="mt-5 w-full max-w-xs">
              <div
                role="progressbar"
                aria-valuenow={progress.done}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-label="Progreso de la restauración"
                className="h-3 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {phase === "summary" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {hasFailures
                  ? "Restauración con errores"
                  : "Restauración completa"}
              </DialogTitle>
            </DialogHeader>
            {hasFailures && !cleaned && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
              >
                No se borró nada de lo que tenías antes — quedaste con tus datos
                originales más lo que sí se pudo crear. Podés reintentar lo que
                falló.
              </div>
            )}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {groups.map((g) => (
                <div key={g.result}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {g.label} ({g.items.length})
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {g.items.map((o, i) => (
                      <li key={i} className="flex items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {ENTITY_LABEL[o.entityType]}
                        </span>
                        <span className="truncate">{o.label}</span>
                        {o.reason && (
                          <span className="text-xs text-muted-foreground">
                            — {o.reason}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <DialogFooter>
              {hasFailures && (
                <Button variant="outline" onClick={onRetryFailed}>
                  Reintentar fallidos
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
