"use client";

import { BookPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { AddBook } from "@/components/books/add-book";

/**
 * Manual book add (#14). Write-gated (ADR-0006): a signed-out reader gets the
 * sign-in prompt; a signed-in reader gets the add form. AI/photo add lands in M3.
 */
export default function AddPage() {
  const { reader, loading } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Agregar libro</h1>
      {loading ? null : reader ? (
        <AddBook />
      ) : (
        <EmptyState
          icon={<BookPlus />}
          title="Alta de libros"
          description="Inicia sesión para agregar libros a tu biblioteca."
          action={<WriteCta label="Agregar libro" />}
        />
      )}
    </div>
  );
}
