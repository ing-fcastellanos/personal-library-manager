"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Target, Check, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Reader } from "@/lib/types/reader";
import {
  finishedThisYear,
  projectedTotal,
  readingGoalFor,
  withReadingGoal,
} from "./reading-goal-stats";

const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * Per-reader annual reading goal (#30): set (self only), progress, and a
 * simple pace-based projection — all-time data the dashboard already fetches,
 * plus a persisted goal in `Reader.preferences.readingGoals`. Only the active
 * reader can set/edit their own goal from this widget; others are read-only.
 * Closes M5.
 */
export function ReadingGoal({
  events,
  readers,
  activeReaderId,
  onGoalSaved,
}: {
  events: ReadingEvent[];
  readers: Reader[];
  activeReaderId: string | null;
  onGoalSaved: (updated: Reader) => void;
}) {
  if (readers.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Meta anual
      </h2>
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {readers.map((r) => (
          <GoalCard
            key={r.id}
            reader={r}
            finished={finishedThisYear(events, r.id)}
            isActive={r.id === activeReaderId}
            onGoalSaved={onGoalSaved}
          />
        ))}
      </div>
    </section>
  );
}

function GoalCard({
  reader,
  finished,
  isActive,
  onGoalSaved,
}: {
  reader: Reader;
  finished: number;
  isActive: boolean;
  onGoalSaved: (updated: Reader) => void;
}) {
  const { toast } = useToast();
  const goal = readingGoalFor(reader);
  const [editing, setEditing] = React.useState(false);
  const [input, setInput] = React.useState(goal != null ? String(goal) : "");
  const [saving, setSaving] = React.useState(false);

  function openEdit() {
    setInput(goal != null ? String(goal) : "");
    setEditing(true);
  }

  async function save() {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Ingresá un número válido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/readers/${reader.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preferences: withReadingGoal(reader, Math.round(n)),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = (await res.json()) as Reader;
      onGoalSaved(updated);
      toast({ title: "Meta guardada", variant: "success" });
      setEditing(false);
    } catch {
      toast({ title: "No se pudo guardar la meta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const met = goal != null && finished >= goal;
  const projection = goal != null ? projectedTotal(finished) : null;

  const editForm = (
    <div>
      <label
        htmlFor={`goal-${reader.id}`}
        className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground"
      >
        Meta anual de {reader.name} (libros)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`goal-${reader.id}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-11 w-20 rounded-[10px] border border-input bg-background px-2 text-center text-[15px] font-semibold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-11 items-center rounded-xl bg-primary px-[18px] text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>
            {reader.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-[15px] font-bold">{reader.name}</span>
        {met ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-bold text-success">
            <Check className="size-3" aria-hidden="true" />
            Cumplida
          </span>
        ) : (
          isActive && (
            <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
              Vos
            </span>
          )
        )}
      </div>

      {goal == null ? (
        editing ? (
          <div className="mt-3.5">{editForm}</div>
        ) : (
          <div
            className={cn(
              "mt-3.5 flex flex-col items-center gap-2.5 rounded-[13px] border-[1.5px] border-dashed px-3.5 text-center",
              isActive ? "py-5" : "py-[26px]",
            )}
          >
            {isActive ? (
              <>
                <Target
                  className="size-[26px] text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-[13.5px] font-semibold">Sin meta este año</p>
                <button
                  type="button"
                  onClick={openEdit}
                  className="mt-0.5 inline-flex h-11 items-center rounded-xl bg-primary px-[18px] text-sm font-bold text-primary-foreground"
                >
                  Fijá tu meta
                </button>
              </>
            ) : (
              <p className="text-[13.5px] font-semibold text-muted-foreground">
                Sin meta
              </p>
            )}
          </div>
        )
      ) : (
        <div className="mt-3.5">
          <div className="flex items-end gap-2">
            <p className="leading-none tracking-tight tabular-nums">
              <span className="text-3xl font-extrabold">
                {nf0.format(finished)}
              </span>
              <span className="text-base font-semibold text-muted-foreground">
                {" "}
                / {nf0.format(goal)}
              </span>
            </p>
            {isActive && !editing && (
              <button
                type="button"
                onClick={openEdit}
                aria-label="Editar tu meta"
                className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] border text-foreground hover:bg-accent"
              >
                <SquarePen className="size-[15px]" aria-hidden="true" />
              </button>
            )}
          </div>
          <div
            role="progressbar"
            aria-label={`${nf0.format(finished)} / ${nf0.format(goal)} libros`}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                "h-full rounded-full",
                met ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${Math.min(100, (finished / goal) * 100)}%` }}
            />
          </div>
          {editing ? (
            <div className="mt-3.5 border-t pt-3.5">{editForm}</div>
          ) : (
            !met &&
            projection != null && (
              <p className="mt-2.5 text-[12.5px] text-muted-foreground">
                A este ritmo, terminarías el año con ~{nf0.format(projection)}{" "}
                libros.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
