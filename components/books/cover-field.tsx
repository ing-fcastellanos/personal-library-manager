"use client";

import * as React from "react";
import {
  Camera,
  Images,
  Sparkles,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CoverPreview } from "./enrich-skeleton";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

export interface CoverFieldProps {
  /** Current cover URL (metadata or a user upload). */
  url?: string;
  title?: string;
  /** ISBN-13, when known — enables "Usar portada de Google". */
  isbn13?: string;
  /**
   * Upload the chosen file; resolve with the new URL. Reject to show an error.
   * Throw `new Error("validation")` for type/size issues handled here already.
   */
  onUpload: (file: File) => Promise<string>;
  /**
   * Fetch the stock cover from the book-identification provider (Google
   * Books); resolve with the new URL. Reject to show an error. Omit to hide
   * the option entirely.
   */
  onUseStockCover?: () => Promise<string>;
  onChange: (url: string | undefined) => void;
}

type Status =
  { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string };

/**
 * Cover with a Cambiar menu (tomar foto / elegir de galería / usar portada de
 * Google) plus Quitar. Validates type + size before upload, shows an in-place
 * "subiendo…" overlay with progress, and an inline error tied to the cover
 * region via aria-describedby. Composes CoverPreview + Button.
 */
export function CoverField({
  url,
  title,
  isbn13,
  onUpload,
  onUseStockCover,
  onChange,
}: CoverFieldProps) {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
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

  async function handleStockCover() {
    if (!onUseStockCover) return;
    setStatus({ kind: "uploading" });
    try {
      const next = await onUseStockCover();
      onChange(next);
      setStatus({ kind: "idle" });
    } catch {
      setStatus({
        kind: "error",
        message: "No encontramos una portada del proveedor.",
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
            ref={cameraInputRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="sr-only"
            aria-label="Tomar foto de la portada"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Elegir portada de la galería"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={status.kind === "uploading"}
              >
                <Camera className="size-[15px]" />
                Cambiar
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => cameraInputRef.current?.click()}
              >
                <Camera />
                Tomar foto
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => galleryInputRef.current?.click()}
              >
                <Images />
                Elegir de la galería
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!onUseStockCover || !isbn13}
                onSelect={handleStockCover}
              >
                <Sparkles />
                Usar portada de Google
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
