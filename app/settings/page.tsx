import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            Cambiá el tema con el botón sol/luna del header. Se recuerda por
            dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/style-guide">Ver style guide</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
