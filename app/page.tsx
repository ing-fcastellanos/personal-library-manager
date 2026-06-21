import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const kpis = [
  { label: "Libros", value: "—" },
  { label: "Leídos", value: "—" },
  { label: "Autores", value: "—" },
  { label: "Pendientes", value: "—" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de tu biblioteca (placeholder — se construye en M5).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Pendiente de datos
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
