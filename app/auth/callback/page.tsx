"use client";

import * as React from "react";
import Link from "next/link";
import { completeSignInFromLink, exchangeForSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export default function CallbackPage() {
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const idToken = await completeSignInFromLink();
        if (!idToken) {
          if (active) setError(true);
          return;
        }
        const res = await exchangeForSession(idToken);
        if (!res.ok) {
          if (active) setError(true);
          return;
        }
        const next = window.localStorage.getItem("plm:next") ?? "/";
        window.localStorage.removeItem("plm:next");
        // Full navigation so the AuthProvider re-reads the new server session.
        window.location.assign(next);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-sm py-10 text-center">
      {error ? (
        <div className="space-y-3">
          <p className="font-semibold">No pudimos completar el acceso.</p>
          <p className="text-sm text-muted-foreground">
            El enlace puede haber expirado o abrirse en otro dispositivo.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">Volver a intentar</Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Iniciando sesión…</p>
      )}
    </div>
  );
}
