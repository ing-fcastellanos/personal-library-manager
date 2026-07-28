"use client";

import * as React from "react";
import { Home, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { createWishItem, checkOwned } from "@/components/wishlist/add";

/**
 * Manual "agregar a deseos" flow (#37, entry point). Collects title / authors /
 * optional ISBN, runs the existing duplicate pre-check (`/api/books/duplicates`)
 * and, when the household already owns the book, shows a **non-blocking** warning
 * ("Ya tenés N ejemplares — ¿Agregar igual?") before creating the item. Creating
 * never makes a `Copy` (design D2).
 */
export function AddWishDialog({
  open,
  onOpenChange,
  readerId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readerId: string;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [authors, setAuthors] = React.useState("");
  const [isbn, setIsbn] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [warn, setWarn] = React.useState<{
    title: string;
    copies: number;
  } | null>(null);

  React.useEffect(() => {
    // Reset the form each time the dialog closes.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!open) {
      setTitle("");
      setAuthors("");
      setIsbn("");
      setWarn(null);
      setBusy(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const authorList = () =>
    authors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

  function snapshot() {
    return {
      bookTitle: title.trim(),
      bookAuthors: authorList(),
      isbn13: isbn.trim() || null,
    };
  }

  async function create() {
    setBusy(true);
    const ok = await createWishItem({
      readerId,
      addedVia: "manual",
      snapshot: snapshot(),
    });
    setBusy(false);
    if (ok) {
      toast({ title: `«${title.trim()}» está en tus deseos` });
      onAdded();
      onOpenChange(false);
    } else {
      toast({ title: "No se pudo agregar el deseo", variant: "destructive" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const owned = await checkOwned(snapshot());
    if (owned) {
      setWarn({ title: owned.title, copies: owned.copies });
      setBusy(false);
      return;
    }
    await create();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {warn ? (
          <>
            <DialogHeader>
              <DialogTitle>Ya tenés este libro en casa</DialogTitle>
              <DialogDescription>
                Está en tus estantes. ¿Agregarlo a deseos igual?
              </DialogDescription>
            </DialogHeader>
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
            <div className="flex flex-col gap-2.5">
              <Button onClick={create} loading={busy}>
                <Plus aria-hidden="true" />
                Agregar igual
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Agregar a deseos</DialogTitle>
              <DialogDescription>
                Un libro que querés leer o comprar. No crea ningún ejemplar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="wish-title">Título</Label>
              <Input
                id="wish-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wish-authors">Autor(es)</Label>
              <Input
                id="wish-authors"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Separá con comas"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wish-isbn">ISBN (opcional)</Label>
              <Input
                id="wish-isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <Button type="submit" loading={busy} disabled={!title.trim()}>
              <Plus aria-hidden="true" />
              Agregar a deseos
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
