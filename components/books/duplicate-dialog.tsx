"use client";

import { Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ExistingBook } from "./types";

export interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: ExistingBook;
  /** "Agregar como copia". */
  onAddCopy: () => void;
  /** "Omitir" — usually just closes. */
  onSkip: () => void;
  /** "Editar el existente" — pass undefined to disable with a "próximamente" tooltip. */
  onEditExisting?: () => void;
}

/**
 * Shown at save time when the book already exists. Built on the shared Dialog
 * (focus trap + Esc close come from Radix). Three actions: Omitir, Agregar como
 * copia, Editar el existente (disabled w/ tooltip when no handler).
 */
export function DuplicateDialog({
  open,
  onOpenChange,
  existing,
  onAddCopy,
  onSkip,
  onEditExisting,
}: DuplicateDialogProps) {
  const initials = existing.title.slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Este libro ya existe</DialogTitle>
          <DialogDescription>
            Lo encontramos en tu biblioteca. ¿Qué querés hacer?
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3.5 rounded-xl border border-border bg-card p-3.5">
          <Avatar className="h-[76px] w-[52px] shrink-0 rounded-md">
            <AvatarImage
              src={existing.coverUrl ?? ""}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="rounded-md bg-gradient-to-br from-primary to-accent text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-semibold leading-tight">
              {existing.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {existing.authors.join(", ")}
              {existing.year ? ` · ${existing.year}` : ""}
            </p>
            <Badge variant="secondary" className="mt-2 w-fit">
              Ya tenés {existing.copies}{" "}
              {existing.copies === 1 ? "ejemplar" : "ejemplares"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button onClick={onAddCopy} className="h-11 gap-2">
            <Plus aria-hidden="true" />
            Agregar como copia
          </Button>
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              Omitir
            </Button>
            {/* Disabled w/ native tooltip until the edit flow ships. */}
            <Button
              variant="outline"
              className="flex-1 gap-2"
              disabled={!onEditExisting}
              title={onEditExisting ? undefined : "Próximamente"}
              onClick={onEditExisting}
            >
              <Pencil aria-hidden="true" />
              Editar existente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
