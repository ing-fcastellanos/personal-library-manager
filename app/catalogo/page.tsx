import { Library } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
      <EmptyState
        icon={<Library />}
        title="Tu biblioteca"
        description="Búsqueda, filtros y estantes (M2)."
      />
    </div>
  );
}
