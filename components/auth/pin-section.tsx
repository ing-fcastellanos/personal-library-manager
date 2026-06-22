"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SetPin } from "@/components/auth/set-pin";
import { buildNextParam } from "@/lib/auth/next-param";
import { useToast } from "@/components/ui/use-toast";
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
  const router = useRouter();
  const { toast } = useToast();

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
          <SetPin
            onSave={async (pin) => {
              const res = await fetch("/api/auth/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
              });
              if (!res.ok) {
                toast({
                  title: "No se pudo guardar el PIN",
                  variant: "destructive",
                });
                throw new Error("failed");
              }
            }}
            onDone={() => router.push("/")}
          />
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push(`/login?next=${buildNextParam()}`)}
          >
            Iniciá sesión para configurar tu PIN
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
