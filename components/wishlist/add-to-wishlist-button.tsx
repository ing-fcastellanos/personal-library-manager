"use client";

import * as React from "react";
import { Heart, Home, Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createWishItem,
  checkOwned,
  type WishSnapshot,
  type WishAddedVia,
  type OwnedMatch,
} from "@/components/wishlist/add";

/**
 * Reusable "Agregar a deseos" action (#37). Drops into any surface that has already
 * resolved a book (ISBN scan, photo/AI, catalog detail): it reads the active reader,
 * runs the non-blocking owned-warning, and creates the item with the given
 * `addedVia`. Renders nothing when no reader is signed in (writes need a session).
 *
 * When the caller already knows the household's copy count (e.g. the catalog detail
 * page), pass `ownedCopies` to skip the duplicate pre-check.
 */
export function AddToWishlistButton({
  snapshot,
  addedVia,
  bookId,
  ownedCopies,
  onAdded,
  label = "Agregar a deseos",
  variant = "outline",
  size,
  className,
}: {
  snapshot: WishSnapshot;
  addedVia: WishAddedVia;
  bookId?: string | null;
  ownedCopies?: number;
  onAdded?: () => void;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { reader } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [warn, setWarn] = React.useState<OwnedMatch | null>(null);

  if (!reader) return null;

  async function create() {
    setBusy(true);
    const ok = await createWishItem({
      readerId: reader!.id,
      addedVia,
      bookId,
      snapshot,
    });
    setBusy(false);
    setWarn(null);
    if (ok) {
      toast({ title: `«${snapshot.bookTitle}» está en tus deseos` });
      onAdded?.();
    } else {
      toast({ title: "No se pudo agregar el deseo", variant: "destructive" });
    }
  }

  async function onClick() {
    setBusy(true);
    const owned =
      ownedCopies !== undefined
        ? ownedCopies > 0
          ? { title: snapshot.bookTitle, copies: ownedCopies }
          : null
        : await checkOwned(snapshot);
    if (owned) {
      setWarn(owned);
      setBusy(false);
      return;
    }
    await create();
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        loading={busy}
        onClick={onClick}
      >
        <Heart aria-hidden="true" />
        {label}
      </Button>

      <Dialog
        open={!!warn}
        onOpenChange={(open) => (open ? null : setWarn(null))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ya tenés este libro en casa</DialogTitle>
            <DialogDescription>
              Está en tus estantes. ¿Agregarlo a deseos igual?
            </DialogDescription>
          </DialogHeader>
          {warn ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{warn.title}</p>
                <Badge variant="secondary" className="mt-2">
                  <Home aria-hidden="true" />
                  Ya tenés {warn.copies}{" "}
                  {warn.copies === 1 ? "ejemplar" : "ejemplares"}
                </Badge>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2.5">
            <Button onClick={create} loading={busy}>
              <Plus aria-hidden="true" />
              Agregar igual
            </Button>
            <Button variant="outline" onClick={() => setWarn(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
