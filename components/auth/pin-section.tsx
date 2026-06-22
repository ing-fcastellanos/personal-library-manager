"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SetPin } from "@/components/auth/set-pin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

/** Settings card for the device-switch PIN. Only meaningful when signed in. */
export function PinSection() {
  const { reader, loading } = useAuth();
  const pathname = usePathname();

  return (
    <Card>
      <CardHeader>
        <CardTitle>PIN</CardTitle>
        <CardDescription>
          Se pide solo al cambiar de lector en este dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? null : reader ? (
          <SetPin />
        ) : (
          <Button asChild variant="outline">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
              Iniciá sesión para configurar tu PIN
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
