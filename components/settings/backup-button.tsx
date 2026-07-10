"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { fetchBackup, backupFilename } from "./backup";

/**
 * "Descargar backup" (#36): fetches every collection and downloads a single
 * JSON file — same Blob/`<a download>` mechanic as the CSV export (#34). Uses
 * `Button`'s built-in `loading` prop rather than hand-rolling the spinner —
 * it already disables the button, sets `aria-busy`, and swaps in a spinner
 * while keeping the label unchanged, exactly what the Claude Design handoff
 * asked for the "downloading" state.
 */
export function BackupButton() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function download() {
    setLoading(true);
    try {
      const backup = await fetchBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFilename(new Date());
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "No se pudo generar el backup", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-1.5"
      onClick={download}
      loading={loading}
    >
      {!loading && <Download className="size-4" aria-hidden="true" />}
      Descargar backup
    </Button>
  );
}
