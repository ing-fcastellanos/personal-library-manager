"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import { SignInPrompt } from "@/components/auth/sign-in-prompt";
import { buildNextParam } from "@/lib/auth/next-param";
import { VolumeRow } from "@/components/series/volume-row";
import { volumeCounts } from "@/services/series/views";
import {
  nextPosition,
  reconcileVolumes,
  removeVolume,
  moveVolume,
  parseAuthors,
} from "@/components/series/link";
import type { Series, SeriesVolume } from "@/lib/types/series";

/**
 * View + edit a tracked series (#38, Claude Design handoff "Series.dc.html").
 * One dialog reused from the book detail's "Serie" section and from
 * `/ajustes/series` — no dedicated series-detail route (design D4). The
 * handoff's mobile chrome is a bottom sheet; this reuses the app's existing
 * centered `Dialog` at every breakpoint, the same call every other feature in
 * this app has made (no bottom-sheet primitive exists yet).
 */
export function SeriesDialog({
  open,
  onOpenChange,
  series,
  highlightBookId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: Series;
  /** The book that opened this dialog, if any — its volume row is highlighted. */
  highlightBookId?: string;
  onUpdated: (series: Series) => void;
}) {
  const { reader } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [name, setName] = React.useState(series.name);
  const [volumes, setVolumes] = React.useState<SeriesVolume[]>(series.volumes);
  const [addFormOpen, setAddFormOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newAuthors, setNewAuthors] = React.useState("");
  const [newIsbn, setNewIsbn] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setEditing(false);
      setName(series.name);
      setVolumes(series.volumes);
      setAddFormOpen(false);
      setNewTitle("");
      setNewAuthors("");
      setNewIsbn("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, series]);

  const { owned, total } = volumeCounts(series);
  const sorted = [...volumes].sort((a, b) => a.position - b.position);
  const completion =
    owned === total
      ? `Completa · ${total} ${total === 1 ? "tomo" : "tomos"}`
      : `${owned} de ${total} ${total === 1 ? "tomo" : "tomos"}`;

  function startEditing() {
    if (!reader) {
      setSignInOpen(true);
      return;
    }
    setEditing(true);
  }

  function addVolume() {
    if (!newTitle.trim()) return;
    setVolumes((v) =>
      reconcileVolumes(v, nextPosition(v), {
        title: newTitle.trim(),
        authors: parseAuthors(newAuthors),
        isbn13: newIsbn.trim() || null,
      }),
    );
    setNewTitle("");
    setNewAuthors("");
    setNewIsbn("");
    setAddFormOpen(false);
  }

  async function save() {
    if (!name.trim() || volumes.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/series/${series.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), volumes }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as Series;
      onUpdated(updated);
      setEditing(false);
      toast({ title: `«${updated.name}» actualizada` });
    } catch {
      toast({ title: "No se pudo guardar la serie", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <>
                    <Label htmlFor="series-name">Nombre de la serie</Label>
                    <Input
                      id="series-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5"
                    />
                  </>
                ) : (
                  <>
                    <DialogTitle>{series.name}</DialogTitle>
                    <DialogDescription>{completion}</DialogDescription>
                  </>
                )}
              </div>
              {!editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  className="shrink-0 gap-1.5"
                  aria-label={`Editar la serie «${series.name}»`}
                >
                  <Pencil aria-hidden="true" />
                  Editar
                </Button>
              )}
            </div>
          </DialogHeader>

          <ul className="flex flex-col gap-2.5">
            {sorted.map((v, i) => {
              const isHere = !!highlightBookId && v.bookId === highlightBookId;
              if (!editing) {
                return (
                  <VolumeRow key={v.position} volume={v} highlight={isHere} />
                );
              }
              const first = i === 0;
              const last = i === sorted.length - 1;
              return (
                <li
                  key={v.position}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-2.5",
                    isHere && "border-primary",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {v.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {v.title}
                      {isHere && (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          (este libro)
                        </span>
                      )}
                    </p>
                    {v.authors.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        {v.authors.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={first}
                      aria-label={`Mover «${v.title}» arriba`}
                      onClick={() =>
                        setVolumes((vs) => moveVolume(vs, v.position, "up"))
                      }
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={last}
                      aria-label={`Mover «${v.title}» abajo`}
                      onClick={() =>
                        setVolumes((vs) => moveVolume(vs, v.position, "down"))
                      }
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar «${v.title}» de la serie`}
                      onClick={() =>
                        setVolumes((vs) => removeVolume(vs, v.position))
                      }
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {editing &&
            (addFormOpen ? (
              <div className="flex flex-col gap-2 rounded-xl border p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Agregar tomo faltante
                </p>
                <Input
                  placeholder="Título"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  aria-label="Título del tomo"
                  autoFocus
                />
                <Input
                  placeholder="Autor(es), separados por coma"
                  value={newAuthors}
                  onChange={(e) => setNewAuthors(e.target.value)}
                  aria-label="Autores del tomo"
                />
                <Input
                  placeholder="ISBN (opcional)"
                  value={newIsbn}
                  onChange={(e) => setNewIsbn(e.target.value)}
                  aria-label="ISBN del tomo"
                  inputMode="numeric"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!newTitle.trim()}
                    onClick={addVolume}
                    className="flex-1"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddFormOpen(true)}
                className="h-11 w-full gap-1.5 border-dashed"
              >
                <Plus aria-hidden="true" />
                Agregar tomo faltante
              </Button>
            ))}

          <DialogFooter>
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  loading={busy}
                  disabled={!name.trim() || volumes.length === 0}
                  onClick={save}
                  className="gap-1.5"
                >
                  <Check aria-hidden="true" />
                  Guardar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignInPrompt
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSignIn={() => router.push(`/login?next=${buildNextParam()}`)}
        action="editar una serie"
      />
    </>
  );
}
