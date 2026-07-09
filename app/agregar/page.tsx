"use client";

import * as React from "react";
import {
  BookPlus,
  Camera,
  Pencil,
  Library,
  Barcode,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { AddBook } from "@/components/books/add-book";
import { AddBookByPhoto } from "@/components/books/add-book-by-photo";
import { AddBookByShelf } from "@/components/books/add-book-by-shelf";
import { AddBookByCode } from "@/components/books/add-book-by-code";
import { AddBookByCsv } from "@/components/books/add-book-by-csv";

type Mode = "photo" | "shelf" | "code" | "manual" | "csv";

/**
 * Book add (#14 manual, #20 by photo, #21 by shelf, #35 by CSV import). Write-gated
 * (ADR-0006): a signed-out reader gets the sign-in prompt; a signed-in reader
 * chooses how to add — one photo, a whole shelf (AI batch), a Goodreads/StoryGraph
 * CSV bootstrap, by code, or by hand.
 */
export default function AddPage() {
  const { reader, loading } = useAuth();
  const [mode, setMode] = React.useState<Mode>("photo");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Agregar libro</h1>
      {loading ? null : reader ? (
        <>
          {/* 2×2 mode grid (Claude Design A1 handoff for #23). */}
          <div
            role="radiogroup"
            aria-label="Cómo agregar"
            className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3.5"
          >
            <ModeTab
              active={mode === "photo"}
              onClick={() => setMode("photo")}
              icon={<Camera className="size-[22px]" aria-hidden="true" />}
              label="Por foto"
            />
            <ModeTab
              active={mode === "shelf"}
              onClick={() => setMode("shelf")}
              icon={<Library className="size-[22px]" aria-hidden="true" />}
              label="Por estante"
            />
            <ModeTab
              active={mode === "code"}
              onClick={() => setMode("code")}
              icon={<Barcode className="size-[22px]" aria-hidden="true" />}
              label="Por código"
            />
            <ModeTab
              active={mode === "manual"}
              onClick={() => setMode("manual")}
              icon={<Pencil className="size-[22px]" aria-hidden="true" />}
              label="Manual"
            />
            <ModeTab
              active={mode === "csv"}
              onClick={() => setMode("csv")}
              icon={<FileUp className="size-[22px]" aria-hidden="true" />}
              label="Importar CSV"
            />
          </div>
          {mode === "photo" && (
            <AddBookByPhoto onManual={() => setMode("manual")} />
          )}
          {mode === "shelf" && <AddBookByShelf />}
          {mode === "code" && <AddBookByCode />}
          {mode === "manual" && <AddBook />}
          {mode === "csv" && <AddBookByCsv />}
        </>
      ) : (
        <EmptyState
          icon={<BookPlus />}
          title="Alta de libros"
          description="Inicia sesión para agregar libros a tu biblioteca."
          action={<WriteCta label="Agregar libro" />}
        />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] p-3 text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-accent font-bold text-accent-foreground"
          : "border-border bg-card font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
