"use client";

import * as React from "react";
import { Camera, Trash2, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CoverPreview } from "./enrich-skeleton";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

export interface CoverFieldProps {
  /** Current cover URL (metadata or a user upload). */
  url?: string;
  title?: string;
  /**
   * Upload the chosen file; resolve with the new URL. Reject to show an error.
   * Throw `new Error("validation")` for type/size issues handled here already.
   */
  onUpload: (file: File) => Promise<string>;
  onChange: (url: string | undefined) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

/**
 * Cover with Cambiar / Quitar actions. Validates type + size before upload,
 * shows an in-place "subiendo…" overlay with progress, and an inline error tied
 * to the cover region via aria-describedby. Composes CoverPreview + Button.
 */
export function CoverField({
  url,
  title,
  onUpload,
  onChange,
}: CoverFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "El archivo debe ser una imagen." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({
        kind: "error",
        message: "La imagen debe pesar menos de 5 MB.",
      });
      return;
    }
    setStatus({ kind: "uploading" });
    try {
      const next = await onUpload(file);
      onChange(next);
      setStatus({ kind: "idle" });
    } catch {
      setStatus({
        kind: "error",
        message: "No se pudo subir la imagen. Probá de nuevo.",
      });
    }
  }

  const errorId = "cover-error";

  return (
    <div
      className="flex gap-3.5"
      aria-describedby={status.kind === "error" ? errorId : undefined}
    >
      <div className="relative">
        <CoverPreview url={url} title={title} className="h-[140px] w-24" />
        {status.kind === "uploading" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-[10px] bg-foreground/55 text-white"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <span className="text-[11px] font-semibold">Subiendo…</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Portada
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Elegir nueva portada"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={status.kind === "uploading"}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-[15px]" />
            Cambiar
          </Button>
          {url && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={status.kind === "uploading"}
              onClick={() => onChange(undefined)}
            >
              <Trash2 className="size-[15px]" />
              Quitar
            </Button>
          )}
        </div>
        {status.kind === "error" ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-start gap-1.5 text-xs font-medium leading-snug text-destructive"
          >
            <AlertCircle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {status.message}
          </p>
        ) : (
          <p className="text-xs leading-snug text-muted-foreground">
            JPG o PNG, hasta 5 MB.
          </p>
        )}
      </div>
    </div>
  );
}
