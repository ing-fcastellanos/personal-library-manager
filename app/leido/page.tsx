"use client";

import * as React from "react";
import { BookCheck, Check, LineChart } from "lucide-react";
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
        className="flex gap-1 rounded-xl bg-muted p-1"
      >
        <TabButton
          selected={tab === "registrar"}
          onClick={() => setTab("registrar")}
          icon={<Check className="size-4" aria-hidden="true" />}
        >
          Registrar
        </TabButton>
        <TabButton
          selected={tab === "historial"}
          onClick={() => setTab("historial")}
          icon={<LineChart className="size-4" aria-hidden="true" />}
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
