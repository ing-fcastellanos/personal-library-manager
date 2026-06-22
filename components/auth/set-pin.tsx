"use client";

import * as React from "react";
import { PinPad } from "@/components/auth/pin-pad";
import { useToast } from "@/components/ui/use-toast";

const LENGTH = 4;

/** Set/change the current reader's PIN: enter then confirm (ADR-0012). */
export function SetPin() {
  const { toast } = useToast();
  const [stage, setStage] = React.useState<"enter" | "confirm">("enter");
  const [first, setFirst] = React.useState("");
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function reset() {
    setStage("enter");
    setFirst("");
    setValue("");
  }

  async function submit(pin: string) {
    if (pin !== first) {
      toast({ title: "Los PIN no coinciden", variant: "destructive" });
      reset();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error("failed");
      toast({ title: "PIN guardado", variant: "success" });
    } catch {
      toast({ title: "No se pudo guardar el PIN", variant: "destructive" });
    } finally {
      setSaving(false);
      reset();
    }
  }

  React.useEffect(() => {
    if (value.length !== LENGTH) return;
    if (stage === "enter") {
      setFirst(value);
      setValue("");
      setStage("confirm");
    } else {
      void submit(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted-foreground">
        {stage === "enter"
          ? "Ingresá un PIN de 4 dígitos"
          : "Confirmá tu PIN"}
      </p>
      <PinPad value={value} onChange={setValue} length={LENGTH} />
      {saving ? (
        <p className="text-sm text-muted-foreground">Guardando…</p>
      ) : null}
    </div>
  );
}
