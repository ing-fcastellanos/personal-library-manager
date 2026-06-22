"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PinPad } from "@/components/auth/pin-pad";

export interface SetPinProps {
  length?: number;
  /** Persist the confirmed PIN. Wire to AuthProvider.setPin in 6.2. */
  onSave: (pin: string) => Promise<void> | void;
  onDone?: () => void;
}

type Step = "enter" | "confirm" | "saved";

/**
 * Two-step "definir PIN" flow built on <PinPad/>: enter → confirm.
 * Surfaces "no coinciden" on mismatch and a success state on save.
 */
export function SetPin({ length = 4, onSave, onDone }: SetPinProps) {
  const [step, setStep] = React.useState<Step>("enter");
  const [first, setFirst] = React.useState("");
  const [value, setValue] = React.useState("");
  const [mismatch, setMismatch] = React.useState(false);

  async function handleComplete(pin: string) {
    if (step === "enter") {
      setFirst(pin);
      setValue("");
      setStep("confirm");
      return;
    }
    if (step === "confirm") {
      if (pin === first) {
        setMismatch(false);
        await onSave(pin);
        setStep("saved");
      } else {
        setMismatch(true);
        // brief shake/feedback window, then clear for retry
        setTimeout(() => setValue(""), 450);
      }
    }
  }

  if (step === "saved") {
    return (
      <div className="flex flex-col items-center text-center">
        <span
          className="flex size-[74px] items-center justify-center rounded-full bg-success text-success-foreground"
          aria-hidden="true"
        >
          <Check className="size-9" strokeWidth={2.4} />
        </span>
        <h1 className="mt-5 text-xl font-bold">PIN guardado</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Usá tu PIN para entrar rápido la próxima vez, sin esperar el correo.
        </p>
        <Button className="mt-6 h-11" onClick={onDone}>
          Ir a mi biblioteca
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-2 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {step === "enter" ? "Paso 1 de 2" : "Paso 2 de 2"}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">
          {step === "enter" ? "Creá tu PIN" : "Repetí tu PIN"}
        </h1>
        <p className="mt-2 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
          {mismatch
            ? "Los PIN no coinciden. Probá de nuevo."
            : step === "enter"
              ? "Elegí un PIN de 4 dígitos para entrar rápido sin esperar el correo."
              : "Ingresá el mismo PIN una vez más para confirmarlo."}
        </p>
      </div>

      <div role="status" aria-live="polite" className="min-h-[22px] text-center text-sm font-semibold text-destructive">
        {mismatch ? "Los PIN no coinciden" : ""}
      </div>

      <PinPad
        length={length}
        value={value}
        error={mismatch}
        onChange={(v) => {
          setValue(v);
          if (mismatch) setMismatch(false);
        }}
        onComplete={handleComplete}
        className="mt-2"
      />
    </div>
  );
}
