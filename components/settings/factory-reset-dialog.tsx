"use client";

import * as React from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BackupButton } from "./backup-button";
import { fetchBackup } from "./backup";
import { runCleanup } from "./restore-run";
import {
  groupRestoreOutcomes,
  ENTITY_LABEL,
  type RestoreOutcome,
} from "./restore-summary";
import {
  planFactoryReset,
  hasAnythingToDelete,
  needsRetry,
  type ResetCounts,
  type ResetPlan,
} from "./factory-reset";

type Phase = "loading" | "empty" | "confirm" | "running" | "summary";

const COUNT_LABELS: { key: keyof ResetCounts; label: string }[] = [
  { key: "books", label: "Libros" },
  { key: "copies", label: "Ejemplares" },
  { key: "readingEvents", label: "Lecturas" },
  { key: "wishlistItems", label: "Deseos" },
  { key: "loans", label: "Préstamos" },
  { key: "series", label: "Series" },
  { key: "shelves", label: "Estantes" },
];

/**
 * "Vaciar biblioteca" (#add-factory-reset). Deletes every book, copy, reading
 * event, wishlist item, loan, series and shelf — never a reader.
 *
 * The deletion is `runCleanup`, the restore's cleanup phase reused verbatim
 * (see `factory-reset.ts` for why). Retry re-reads the library and deletes
 * whatever survived rather than replaying the failed ids: a reset is
 * convergent, so resuming toward "empty" is both simpler and more correct than
 * retrying a stale plan.
 *
 * The summary reuses `groupRestoreOutcomes` for grouping but labels the groups
 * locally — its own `RESULT_GROUPS` calls deletions "Reemplazados", which is
 * true of a restore and wrong here, where nothing replaces what was removed.
 */
const GROUP_LABEL: Partial<Record<RestoreOutcome["result"], string>> = {
  deleted: "Borrados",
  failed: "No se pudieron borrar",
};

export function FactoryResetDialog() {
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [plan, setPlan] = React.useState<ResetPlan | null>(null);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = React.useState<RestoreOutcome[]>([]);

  const load = React.useCallback(async () => {
    setPhase("loading");
    const next = planFactoryReset(await fetchBackup());
    setPlan(next);
    setPhase(hasAnythingToDelete(next) ? "confirm" : "empty");
  }, []);

  function reset() {
    setPhase("loading");
    setPlan(null);
    setProgress({ done: 0, total: 0 });
    setOutcomes([]);
  }

  // `target` is passed explicitly rather than read from the `plan` state: this
  // runs in the same handler that just set it, before React has applied the
  // update, so reading state here would see the previous (or null) plan.
  async function run(target: ResetPlan) {
    setPhase("running");
    setProgress({ done: 0, total: target.total });
    const result = await runCleanup(target.snapshot, (done, total) =>
      setProgress({ done, total }),
    );
    setOutcomes(result);
    setPhase("summary");
  }

  async function onConfirm() {
    if (!plan) return;
    await run(plan);
  }

  /** Re-plans from the live library, so already-deleted entities aren't retried. */
  async function onRetry() {
    setPhase("loading");
    const next = planFactoryReset(await fetchBackup());
    setPlan(next);
    if (!hasAnythingToDelete(next)) {
      setOutcomes([]);
      setPhase("empty");
      return;
    }
    await run(next);
  }

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const groups = groupRestoreOutcomes(outcomes);
  const failed = needsRetry(outcomes);
  const deletedCount = outcomes.filter((o) => o.result === "deleted").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
        else reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-1.5">
          <Trash2 className="size-4" aria-hidden="true" />
          Vaciar biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {phase === "loading" && (
          <div className="flex flex-col items-center px-2 py-10 text-center">
            <Loader2
              className="size-8 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm text-muted-foreground" role="status">
              Calculando qué se va a borrar…
            </p>
          </div>
        )}

        {phase === "empty" && (
          <>
            <DialogHeader>
              <DialogTitle>La biblioteca ya está vacía</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              No hay libros, ejemplares, lecturas ni nada más que borrar.
            </p>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}

        {phase === "confirm" && plan && (
          <>
            <DialogHeader>
              <DialogTitle>Vaciar la biblioteca</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Descargá un backup antes si
              querés poder volver atrás — después podés restaurarlo desde
              «Restaurar backup».
            </p>
            <div className="rounded-xl border border-border p-3">
              <BackupButton />
            </div>
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div className="w-full space-y-1">
                <p className="font-semibold">Se va a borrar</p>
                {COUNT_LABELS.filter(({ key }) => plan.counts[key] > 0).map(
                  ({ key, label }) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span>{label}</span>
                      <span className="font-semibold">{plan.counts[key]}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">No se toca</p>
              <p className="mt-1">
                Los lectores y su acceso, el PIN y los ajustes de IA quedan como
                están. Las portadas ya subidas siguen ocupando espacio en el
                almacenamiento aunque no se vean más desde la app.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={onConfirm}>
                Borrar todo
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
              Borrando {progress.done}/{progress.total}
            </p>
            <div className="mt-5 w-full max-w-xs">
              <div
                role="progressbar"
                aria-valuenow={progress.done}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-label="Progreso del borrado"
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
                {failed ? "Quedaron cosas sin borrar" : "Biblioteca vaciada"}
              </DialogTitle>
            </DialogHeader>
            {failed ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
              >
                Se borraron {deletedCount} de {progress.total}. Reintentar
                retoma desde donde quedó — lo ya borrado no se vuelve a
                intentar.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Se borraron {deletedCount} elementos. Tus lectores y el acceso
                siguen intactos.
              </p>
            )}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {groups.map((g) => (
                <div key={g.result}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABEL[g.result] ?? g.label} ({g.items.length})
                  </p>
                  {g.result === "failed" && (
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {g.items.map((o, i) => (
                        <li key={i} className="flex items-baseline gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {ENTITY_LABEL[o.entityType]}
                          </span>
                          {o.reason && (
                            <span className="text-xs text-muted-foreground">
                              — {o.reason}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              {failed && (
                <Button variant="outline" onClick={onRetry}>
                  Reintentar
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
