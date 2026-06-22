import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReadersManager } from "@/components/readers/readers-manager";
import { PinSection } from "@/components/auth/pin-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lectores</h2>
        <ReadersManager />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Seguridad</h2>
        <PinSection />
      </section>

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
