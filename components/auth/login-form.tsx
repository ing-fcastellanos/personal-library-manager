"use client";

import * as React from "react";
import { BookOpen, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 45;

export interface LoginFormProps {
  /**
   * Sends the magic-link. Reject the promise to surface the error state.
   * Wire this to your AuthProvider.signInWithEmail in 6.2.
   */
  onSendLink: (email: string) => Promise<void>;
  /** Optional: let read-only users continue without an account. */
  onExploreWithoutAccount?: () => void;
}

type Phase = "idle" | "sending" | "sent" | "error";

/**
 * Magic-link login (`/login`). Passwordless. Covers: form (default/focus/
 * disabled), validation error, loading and the "revisá tu correo" success state
 * with a throttled resend.
 */
export function LoginForm({
  onSendLink,
  onExploreWithoutAccount,
}: LoginFormProps) {
  const [email, setEmail] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError("Ingresá un correo válido.");
      return;
    }
    setFieldError(null);
    setPhase("sending");
    try {
      await onSendLink(email.trim());
      setPhase("sent");
      setResendIn(RESEND_SECONDS);
    } catch {
      setPhase("error");
    }
  }

  if (phase === "sent") {
    return (
      <div className="flex flex-col items-center text-center">
        <span
          className="mb-5 flex size-16 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden="true"
        >
          <MailCheck className="size-7" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">Revisá tu correo</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Enviamos un enlace a{" "}
          <span className="font-semibold text-foreground">{email.trim()}</span>.
          Abrilo en este dispositivo para entrar.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          disabled={resendIn > 0}
          onClick={() => submit()}
        >
          Reenviar enlace
        </Button>
        {resendIn > 0 && (
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            Reenviar disponible en 0:{String(resendIn).padStart(2, "0")}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setPhase("idle");
            setEmail("");
          }}
          className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      <span
        className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <BookOpen className="size-6" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">Iniciá sesión</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Te enviamos un enlace para entrar sin contraseña.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor={inputId}>Correo electrónico</Label>
        <Input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="vos@correo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? errorId : undefined}
          className={fieldError ? "border-destructive" : undefined}
        />
        {fieldError && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-sm font-medium text-destructive"
          >
            {fieldError}
          </p>
        )}
      </div>

      <Button type="submit" className="mt-4 h-11" loading={phase === "sending"}>
        {phase === "sending" ? "Enviando…" : "Enviar enlace"}
      </Button>

      {phase === "error" && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm leading-snug text-foreground"
        >
          No pudimos enviar el enlace. Revisá tu conexión e intentá de nuevo.
        </div>
      )}

      {onExploreWithoutAccount && (
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          ¿Solo querés leer?{" "}
          <button
            type="button"
            onClick={onExploreWithoutAccount}
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Explorá sin cuenta
          </button>
        </p>
      )}
    </form>
  );
}
