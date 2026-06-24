import { CatalogBrowse } from "@/components/catalog/catalog-browse";

/**
 * Catalog browse (#17). Public read: search + filters + list/grid of books, each
 * linking to its detail. Replaces the M2 placeholder.
 */
export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
      <CatalogBrowse />
    </div>
  );
}
