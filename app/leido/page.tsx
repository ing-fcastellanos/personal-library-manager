"use client";

import { BookCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { MarkAsRead } from "@/components/reading/mark-as-read";

/**
 * Register a finished reading (#24). Write-gated (ADR-0006): a signed-out reader
 * gets the sign-in prompt; a signed-in reader finds the book (search or photo) and
 * confirms the reading, attributed to them.
 */
export default function MarkReadPage() {
  const { reader, loading } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Marcar leído</h1>
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
  );
}
