"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import type { Reader } from "@/lib/types/reader";
import { PinPad } from "@/components/auth/pin-pad";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Full-screen lock for the active reader on a shared shelf device (ADR-0013).
 * Shows the active reader's avatar + name and a numeric PIN-pad, and verifies the
 * PIN against the existing backend — it only re-confirms the same reader, never
 * switches identity.
 *
 * States: default / error (PIN incorrecto). On a wrong PIN the dots flash
 * destructive, the avatar shakes, an assertive live region announces the error,
 * and the value clears for retry (backend rate-limits repeated failures).
 */
export function LockScreen({
  reader,
  onUnlock,
}: {
  reader: Reader;
  onUnlock: () => void;
}) {
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  async function handleComplete(value: string) {
    let ok = false;
    try {
      const res = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readerId: reader.id, pin: value }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }

    if (ok) {
      setError(false);
      onUnlock();
      return;
    }

    setError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setPin(""), 450);
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col bg-background px-6 pb-8 pt-12 text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className={cn("relative", shake && "motion-safe:animate-shake")}>
          <Avatar
            className={cn(
              "size-[78px] border-[2.5px] text-2xl font-bold",
              error ? "border-destructive" : "border-primary",
            )}
          >
            {reader.avatar ? <AvatarImage src={reader.avatar} alt="" /> : null}
            <AvatarFallback className="bg-accent text-2xl font-bold text-accent-foreground">
              {initials(reader.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-[3px] border-background bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Lock className="size-3.5" />
          </span>
        </div>

        <h1 className="mt-4 text-lg font-bold">Hola, {reader.name}</h1>
        <p
          className={cn(
            "mt-1.5 min-h-5 text-sm font-medium",
            error ? "text-destructive" : "text-muted-foreground",
          )}
          role={error ? "status" : undefined}
          aria-live={error ? "assertive" : undefined}
        >
          {error
            ? "PIN incorrecto. Probá de nuevo."
            : "Ingresá tu PIN para continuar"}
        </p>
      </div>

      <PinPad
        value={pin}
        error={error}
        onChange={(v) => {
          setPin(v);
          if (error) setError(false);
        }}
        onComplete={handleComplete}
        className="mx-auto w-full max-w-xs"
      />
    </div>
  );
}
