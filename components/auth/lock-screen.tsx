"use client";

import * as React from "react";
import type { Reader } from "@/lib/types/reader";
import { PinPad } from "@/components/auth/pin-pad";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
 * Full-screen lock for the active reader on a shared device (ADR-0013). Verifies
 * the reader's PIN via the existing backend; it only re-confirms the same reader,
 * never switches identity.
 */
export function LockScreen({
  reader,
  onUnlock,
}: {
  reader: Reader;
  onUnlock: () => void;
}) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState(false);

  async function verify(pin: string) {
    try {
      const res = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readerId: reader.id, pin }),
      });
      if (res.ok) {
        onUnlock();
        return;
      }
    } catch {
      // fall through to error
    }
    setError(true);
    setTimeout(() => {
      setValue("");
      setError(false);
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background p-6">
      <Avatar className="size-16">
        {reader.avatar ? <AvatarImage src={reader.avatar} alt="" /> : null}
        <AvatarFallback
          className="text-lg"
          style={
            reader.displayColor
              ? { backgroundColor: reader.displayColor, color: "#fff" }
              : undefined
          }
        >
          {initials(reader.name)}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight">{reader.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {error ? "PIN incorrecto. Probá de nuevo." : "Ingresá tu PIN para desbloquear"}
        </p>
      </div>
      <PinPad
        value={value}
        error={error}
        onChange={(v) => {
          setValue(v);
          if (error) setError(false);
        }}
        onComplete={verify}
      />
    </div>
  );
}
