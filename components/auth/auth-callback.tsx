"use client";

import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface AuthCallbackProps {
  /** "loading" while verifying the token, "error" if it failed/expired. */
  state: "loading" | "error";
  onRetry?: () => void;
}

/**
 * Magic-link landing screen (`/auth/callback`). Shows a verifying spinner or a
 * recoverable error (expired link / opened on another device).
 */
export function AuthCallback({ state, onRetry }: AuthCallbackProps) {
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
        <h1 className="mt-5 text-lg font-semibold">Iniciando sesión…</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Estamos verificando tu enlace. Esto toma un segundo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className="flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive"
        aria-hidden="true"
      >
        <AlertCircle className="size-8" />
      </span>
      <h1 className="mt-5 text-lg font-semibold">Enlace no válido</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Expiró o se abrió en otro dispositivo. Pedí uno nuevo desde el mismo teléfono.
      </p>
      <Button className="mt-6 h-11" onClick={onRetry}>
        Volver a intentar
      </Button>
    </div>
  );
}
