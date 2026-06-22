import { BookPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";

export default function AddPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Agregar libros</h1>
      <EmptyState
        icon={<BookPlus />}
        title="Alta de libros"
        description="Manual, por ISBN/código de barras o por foto con IA (M2–M3)."
        action={<WriteCta label="Agregar libro" />}
      />
    </div>
  );
}
