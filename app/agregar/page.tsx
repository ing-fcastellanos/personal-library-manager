"use client";

import * as React from "react";
import { BookPlus, Camera, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteCta } from "@/components/auth/write-cta";
import { useAuth } from "@/components/auth/auth-provider";
import { AddBook } from "@/components/books/add-book";
import { AddBookByPhoto } from "@/components/books/add-book-by-photo";

/**
 * Book add (#14 manual, #20 by photo). Write-gated (ADR-0006): a signed-out
 * reader gets the sign-in prompt; a signed-in reader chooses how to add — by photo
 * (AI identification, #20) or by hand.
 */
export default function AddPage() {
  const { reader, loading } = useAuth();
  const [mode, setMode] = React.useState<"photo" | "manual">("photo");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Agregar libro</h1>
      {loading ? null : reader ? (
        <>
          <div
            role="tablist"
            aria-label="Cómo agregar"
            className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
          >
            <ModeTab
              active={mode === "photo"}
              onClick={() => setMode("photo")}
              icon={<Camera className="size-4" aria-hidden="true" />}
              label="Por foto"
            />
            <ModeTab
              active={mode === "manual"}
              onClick={() => setMode("manual")}
              icon={<Pencil className="size-4" aria-hidden="true" />}
              label="Manual"
            />
          </div>
          {mode === "photo" ? <AddBookByPhoto /> : <AddBook />}
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
