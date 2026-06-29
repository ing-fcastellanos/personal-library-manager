"use client";

import * as React from "react";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { ImportSummary } from "@/components/books/import-summary-view";
import {
  loadImport,
  saveImport,
  type ImportOutcome,
} from "@/components/books/import-summary";

/**
 * AI import summary (#22). Reads the last import's outcomes from `sessionStorage`
 * so the summary survives a reload and a round-trip to a book's edit screen; undo
 * and retry update the persisted list. Write-gated like `/agregar`.
 */
export default function ImportSummaryPage() {
  const { reader, loading } = useAuth();
  const [outcomes, setOutcomes] = React.useState<ImportOutcome[] | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutcomes(loadImport() ?? []);
  }, []);

  function update(next: ImportOutcome[]) {
    setOutcomes(next);
    saveImport(next);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
      {loading || outcomes === null ? null : !reader ? (
        <EmptyState
          icon={<PackageOpen />}
          title="Resumen de importación"
          description="Inicia sesión para ver tus altas por IA."
          action={<WriteCta label="Agregar libro" />}
        />
      ) : outcomes.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title="Nada que mostrar"
          description="Acá aparece el resumen después de agregar libros por IA."
          action={
            <Button asChild>
              <Link href="/agregar">Agregar libros</Link>
            </Button>
          }
        />
      ) : (
        <ImportSummary outcomes={outcomes} onChange={update} />
      )}
    </div>
  );
}
