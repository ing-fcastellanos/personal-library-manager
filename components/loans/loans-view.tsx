"use client";

import * as React from "react";
import { ArrowUpRight, Clock, History, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { formatReadingDate } from "@/components/reading/history";
import { initials, dueLabel } from "@/components/loans/format";
import { isOverdue, loansByBorrower, openLoans } from "@/services/loans/views";
import type { Loan } from "@/lib/types/loan";

type Tab = "afuera" | "historial";

async function listJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * `/prestamos` (#39, Claude Design handoff "Préstamos"). Everything currently
 * out, grouped by borrower, plus the closed-loan history — the same route
 * whichever tab is active (design: no 7th bottom-nav item, reached from the
 * catalog's "Afuera" chip). Loans already carry their book snapshot (design
 * D4), so this needs only `/api/loans` — no book/copy join required.
 */
export function LoansView() {
  const { toast } = useToast();
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>("afuera");

  const reload = React.useCallback(async () => {
    setLoans(await listJson<Loan>("/api/loans"));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const today = new Date().toISOString().slice(0, 10);
  const open = openLoans(loans);
  const groups = loansByBorrower(loans);
  const history = loans
    .filter((l) => !!l.returnedAt)
    .sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? ""));
  const overdueCount = open.filter((l) => isOverdue(l, today)).length;

  async function devolver(loan: Loan) {
    try {
      const res = await fetch(`/api/loans/${loan.id}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ returnedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const updated = (await res.json()) as Loan;
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast({ title: `«${updated.bookTitle}» volvió a casa` });
    } catch {
      toast({
        title: "No se pudo registrar la devolución",
        variant: "destructive",
      });
    }
  }

  const scopeLine =
    tab === "historial"
      ? "Préstamos cerrados · lo que ya volvió"
      : open.length === 0
        ? "Nada afuera"
        : `${open.length} ${open.length === 1 ? "libro afuera" : "libros afuera"}${
            overdueCount ? ` · ${overdueCount} vencido` : ""
          }`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Préstamos</h1>

      <div
        role="tablist"
        aria-label="Vistas de Préstamos"
        className="flex gap-1 rounded-xl bg-muted p-1"
      >
        <TabButton
          selected={tab === "afuera"}
          onClick={() => setTab("afuera")}
          icon={<ArrowUpRight className="size-4" aria-hidden="true" />}
        >
          Afuera
        </TabButton>
        <TabButton
          selected={tab === "historial"}
          onClick={() => setTab("historial")}
          icon={<History className="size-4" aria-hidden="true" />}
        >
          Historial
        </TabButton>
      </div>

      <p className="px-1 text-xs text-muted-foreground">{scopeLine}</p>

      <div
        role="tabpanel"
        aria-label={tab === "afuera" ? "Afuera" : "Historial"}
      >
        {loading ? null : tab === "afuera" ? (
          open.length === 0 ? (
            <EmptyState
              icon={<Home />}
              title="Nada prestado"
              description="Todo está en casa. Cuando le prestes un ejemplar a alguien, va a aparecer acá."
              action={
                <Button variant="outline" onClick={() => setTab("historial")}>
                  Ver historial
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <BorrowerSection
                  key={g.borrowerKey}
                  borrowerKey={g.borrowerKey}
                  borrowerName={g.borrowerName}
                  loans={g.loans}
                  today={today}
                  onDevolver={devolver}
                />
              ))}
            </div>
          )
        ) : history.length === 0 ? (
          <EmptyState icon={<History />} title="Sin préstamos cerrados" />
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-2.5"
                >
                  <Cover coverUrl={h.coverUrl} title={h.bookTitle} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {h.bookTitle}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.borrowerName} · {formatReadingDate(h.loanedAt)} →{" "}
                      {formatReadingDate(h.returnedAt ?? "")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Devuelto
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-4 px-2 text-center text-xs leading-relaxed text-muted-foreground">
              Se guarda todo: quién, desde cuándo y hasta cuándo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-card font-bold text-foreground shadow-sm"
          : "font-semibold text-muted-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Cover({
  coverUrl,
  title,
}: {
  coverUrl?: string | null;
  title: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt=""
        aria-hidden="true"
        className="h-14 w-10 flex-none rounded-md object-cover shadow-sm"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      title={title}
      className="grid h-14 w-10 flex-none place-items-center rounded-md border border-dashed border-border bg-muted text-muted-foreground"
    >
      <ArrowUpRight className="size-4" />
    </div>
  );
}

function BorrowerSection({
  borrowerKey,
  borrowerName,
  loans,
  today,
  onDevolver,
}: {
  borrowerKey: string;
  borrowerName: string;
  loans: Loan[];
  today: string;
  onDevolver: (loan: Loan) => void;
}) {
  const anyOverdue = loans.some((l) => isOverdue(l, today));
  const headingId = `borrower-${borrowerKey}`;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-center gap-2.5">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">
            {initials(borrowerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate text-sm font-bold">
            {borrowerName}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {loans.length === 1
              ? "1 libro afuera"
              : `${loans.length} libros afuera`}
          </p>
        </div>
        {anyOverdue && (
          <Badge variant="destructive" className="shrink-0">
            Vencido
          </Badge>
        )}
      </div>
      <ul className="flex flex-col gap-2.5">
        {loans.map((l) => {
          const overdue = isOverdue(l, today);
          return (
            <li
              key={l.id}
              className={cn(
                "flex flex-col gap-2.5 rounded-xl border bg-card p-3",
                overdue && "border-destructive/40",
              )}
            >
              <div className="flex gap-3">
                <Cover coverUrl={l.coverUrl} title={l.bookTitle} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {l.bookTitle}
                  </p>
                  {l.bookAuthors.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {l.bookAuthors.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prestado desde el {formatReadingDate(l.loanedAt)}
                  </p>
                  {l.dueDate && (
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs",
                        overdue
                          ? "font-bold text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      <Clock className="size-3" aria-hidden="true" />
                      {dueLabel(l.dueDate, overdue, today)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => onDevolver(l)}
                aria-label={`Marcar «${l.bookTitle}» como devuelto`}
              >
                Devolver
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
