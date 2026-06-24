"use client";

import { use } from "react";
import { Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { EditBook } from "@/components/books/edit-book";

/**
 * Edit a book (#15). Write-gated (ADR-0006): a signed-out reader gets the sign-in
 * prompt; a signed-in reader gets the editor. Reached from the duplicate dialog
 * "Editar el existente" and "Ver libro" (#14), or by direct URL (the catalog list
 * that links here is #17).
 */
export default function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { reader, loading } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar libro</h1>
      {loading ? null : reader ? (
        <EditBook bookId={id} />
      ) : (
        <EmptyState
          icon={<Pencil />}
          title="Editar libro"
          description="Inicia sesión para editar libros de tu biblioteca."
          action={<WriteCta label="Iniciar sesión" />}
        />
      )}
    </div>
  );
}
