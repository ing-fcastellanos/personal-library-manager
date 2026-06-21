import { BookCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function MarkReadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Marcar leído</h1>
      <EmptyState
        icon={BookCheck}
        title="Registrar lectura terminada"
        description="Buscá en el catálogo o identificá por foto, con rating y reseña (M4)."
      />
    </div>
  );
}
