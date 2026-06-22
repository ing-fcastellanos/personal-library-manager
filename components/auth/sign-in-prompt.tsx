"use client";

import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface SignInPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: () => void;
  /** Tailor the copy to the blocked action, e.g. "agregar este libro". */
  action?: string;
}

/**
 * Contextual "necesitás iniciar sesión" prompt, shown when an unauthenticated
 * reader triggers a write action. Built on the shared Dialog primitive (which
 * centers on desktop); for a mobile bottom-sheet feel, swap DialogContent for a
 * Sheet with side="bottom".
 */
export function SignInPrompt({
  open,
  onOpenChange,
  onSignIn,
  action,
}: SignInPromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <span
          className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"
          aria-hidden="true"
        >
          <KeyRound className="size-6" />
        </span>
        <DialogHeader>
          <DialogTitle>Iniciá sesión para guardar</DialogTitle>
          <DialogDescription>
            Podés leer y explorar sin cuenta. Para {action ?? "agregar libros o marcar lecturas"}{" "}
            necesitás iniciar sesión.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ahora no
          </Button>
          <Button onClick={onSignIn}>Iniciar sesión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
