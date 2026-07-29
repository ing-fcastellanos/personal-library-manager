"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
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
import { todayIso } from "@/components/reading/mark-read";
import { formatReadingDate } from "@/components/reading/history";
import { initials } from "@/components/loans/format";
import type { BorrowerSuggestion } from "@/components/loans/borrowers";
import type { Loan } from "@/lib/types/loan";

/**
 * The Prestar form (#39, Claude Design handoff "Préstamos"). Free-text borrower
 * name with autocomplete over names already used (design D2) — a real
 * keyboard-operable combobox since none existed in the codebase yet. Lending
 * requires a session (`requireAuth` server-side); callers gate this behind a
 * signed-in reader and show `SignInPrompt` otherwise, the same pattern as
 * `AddToWishlistButton`.
 */
export function LendDialog({
  open,
  onOpenChange,
  copyId,
  bookTitle,
  copyLabel,
  borrowers,
  onLent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copyId: string;
  bookTitle: string;
  copyLabel: string;
  borrowers: BorrowerSuggestion[];
  onLent: (loan: Loan) => void;
}) {
  const { toast } = useToast();
  const [who, setWho] = React.useState("");
  const [since, setSince] = React.useState(todayIso());
  const [due, setDue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [acOpen, setAcOpen] = React.useState(false);
  const [acIndex, setAcIndex] = React.useState(-1);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!open) {
      setWho("");
      setSince(todayIso());
      setDue("");
      setNotes("");
      setAcOpen(false);
      setAcIndex(-1);
      setBusy(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const q = who.trim().toLowerCase();
  const matches = q
    ? borrowers.filter((b) => b.name.toLowerCase().includes(q))
    : borrowers;
  const showNew =
    who.trim().length > 0 && !matches.some((b) => b.name.toLowerCase() === q);
  const listOpen = acOpen && (matches.length > 0 || who.trim().length > 0);

  function pick(name: string) {
    setWho(name);
    setAcOpen(false);
    setAcIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!matches.length) return;
      const next =
        e.key === "ArrowDown"
          ? (acIndex + 1) % matches.length
          : acIndex <= 0
            ? matches.length - 1
            : acIndex - 1;
      setAcOpen(true);
      setAcIndex(next);
    } else if (e.key === "Enter") {
      if (acOpen && acIndex >= 0 && matches[acIndex]) {
        e.preventDefault();
        pick(matches[acIndex].name);
      }
    } else if (e.key === "Escape") {
      if (acOpen) {
        e.stopPropagation();
        setAcOpen(false);
        setAcIndex(-1);
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = who.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          copyId,
          borrowerName: name,
          loanedAt: since || todayIso(),
          dueDate: due || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const loan = (await res.json()) as Loan;
      onLent(loan);
      onOpenChange(false);
      toast({
        title: `Prestado a ${name}`,
        description: due
          ? `Vence el ${formatReadingDate(due)}.`
          : "Sin fecha de devolución.",
      });
    } catch {
      toast({
        title: "No se pudo registrar el préstamo",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Prestar «{bookTitle}»</DialogTitle>
          <DialogDescription>{copyLabel}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="relative">
            <Label htmlFor="loan-who">Nombre de quien se lo lleva</Label>
            <Input
              id="loan-who"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls="loan-who-listbox"
              aria-autocomplete="list"
              aria-activedescendant={
                acIndex >= 0 && matches[acIndex]
                  ? `loan-who-opt-${acIndex}`
                  : undefined
              }
              aria-describedby="loan-who-hint"
              autoComplete="off"
              placeholder="Juan Pérez"
              value={who}
              onChange={(e) => {
                setWho(e.target.value);
                setAcOpen(true);
                setAcIndex(-1);
              }}
              onFocus={() => setAcOpen(true)}
              onKeyDown={onKeyDown}
              className="mt-1.5"
              autoFocus
            />
            <p
              id="loan-who-hint"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              Alguien de afuera de casa. Elegí de la lista para no duplicar
              nombres.
            </p>
            {listOpen && (
              <ul
                id="loan-who-listbox"
                role="listbox"
                aria-label="Personas a las que ya le prestaste"
                className="absolute inset-x-0 top-[70px] z-10 max-h-46 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              >
                {matches.map((b, i) => (
                  <li
                    key={b.name}
                    id={`loan-who-opt-${i}`}
                    role="option"
                    aria-selected={i === acIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(b.name);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2",
                      i === acIndex && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
                    >
                      {initials(b.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {b.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {b.count === 1 ? "1 préstamo" : `${b.count} préstamos`}
                    </span>
                  </li>
                ))}
                {showNew && (
                  <li className="border-t border-border px-2.5 py-2 text-xs text-muted-foreground">
                    Se lo llevó alguien nuevo
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor="loan-since">Fecha de préstamo</Label>
              <Input
                id="loan-since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Label htmlFor="loan-due">
                Fecha de devolución{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="loan-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="loan-notes">
              Notas{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <textarea
              id="loan-notes"
              rows={2}
              placeholder="Se lo lleva al viaje"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 flex w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Sin fecha de devolución el préstamo queda abierto: nunca va a
            figurar como vencido.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={!who.trim()}
              className="gap-1.5"
              aria-label={`Prestar «${bookTitle}»`}
            >
              <ArrowUpRight aria-hidden="true" />
              Prestar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
