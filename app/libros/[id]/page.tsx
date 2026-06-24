"use client";

import { use } from "react";
import { BookDetail } from "@/components/catalog/book-detail";

/**
 * Book detail (#17). Read-only view reached from the catalog and from #14's
 * "view book". Public read; the Edit action gates on session at /editar.
 */
export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Libro</h1>
      <BookDetail bookId={id} />
    </div>
  );
}
