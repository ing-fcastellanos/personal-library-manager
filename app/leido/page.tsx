"use client";

import * as React from "react";
import { BookCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { MarkAsRead } from "@/components/reading/mark-as-read";
import { ReadingHistory } from "@/components/reading/reading-history";

/**
 * The "Leído" section — everything about finished readings. Two tabs: **Registrar**
 * (mark-as-read, #24/#25, write-gated per ADR-0006) and **Historial** (the reading
 * history timeline, #26 — a public read; editing an own entry needs sign-in).
 */
type Tab = "registrar" | "historial";

export default function ReadPage() {
  const { reader, loading } = useAuth();
  const [tab, setTab] = React.useState<Tab>("registrar");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Leído</h1>

      <div
        role="tablist"
        aria-label="Leído"
        className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1.5"
      >
        <TabButton
          selected={tab === "registrar"}
          onClick={() => setTab("registrar")}
        >
          Registrar
        </TabButton>
        <TabButton
          selected={tab === "historial"}
          onClick={() => setTab("historial")}
        >
          Historial
        </TabButton>
      </div>

      {tab === "registrar" ? (
        <div role="tabpanel" aria-label="Registrar">
          {loading ? null : reader ? (
            <MarkAsRead />
          ) : (
            <EmptyState
              icon={<BookCheck />}
              title="Registrar lectura terminada"
              description="Iniciá sesión para marcar libros como leídos."
              action={<WriteCta label="Registrar lectura" />}
            />
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Historial">
          <ReadingHistory />
        </div>
      )}
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
