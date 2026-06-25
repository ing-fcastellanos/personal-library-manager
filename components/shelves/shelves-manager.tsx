"use client";

import * as React from "react";
import Link from "next/link";
import {
  Library,
  Pencil,
  Trash2,
  Plus,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useShelvesWithCounts, type ShelfWithCount } from "./use-shelves";

/**
 * Shelf management (#18, Claude Design handoff "Shelves Manager"). A Settings
 * section that lists shelves with their book counts and lets a reader create /
 * edit / delete them. Reuses the shelf CRUD endpoints and the catalog facets for
 * counts; "ver contenido" links to the catalog filtered by the shelf (#17).
 * Recreated from the design prototype over the existing `ui` primitives.
 */
export function ShelvesManager() {
  const { shelves, loading, refresh } = useShelvesWithCounts();

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalBooks = shelves!.reduce((sum, s) => sum + s.bookCount, 0);

  if (shelves!.length === 0) {
    return (
      <EmptyState
        icon={<Library />}
        title="Todavía no hay estantes"
        description="Creá estantes para organizar dónde vive cada libro de tu biblioteca."
        action={
          <ShelfDialog
            trigger={
              <Button className="gap-2">
                <Plus className="size-4" />
                Agregar estante
              </Button>
            }
            onSaved={refresh}
          />
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {shelves!.length} {shelves!.length === 1 ? "estante" : "estantes"} ·{" "}
          {totalBooks} {totalBooks === 1 ? "libro" : "libros"}
        </p>
        <ShelfDialog
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Agregar estante
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {shelves!.map((shelf) => (
        <Card key={shelf.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Library className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{shelf.name}</p>
                {shelf.location && (
                  <p className="truncate text-sm text-muted-foreground">
                    {shelf.location}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {shelf.bookCount} {shelf.bookCount === 1 ? "libro" : "libros"}
              </Badge>
            </div>
            {shelf.description && (
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground/85">
                {shelf.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                asChild
              >
                <Link href={`/catalogo?shelf=${shelf.id}`}>
                  <Eye className="size-4" />
                  Ver contenido
                </Link>
              </Button>
              <ShelfDialog
                shelf={shelf}
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Editar estante"
                  >
                    <Pencil className="size-4" />
                  </Button>
                }
                onSaved={refresh}
              />
              <DeleteShelfDialog shelf={shelf} onDeleted={refresh} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Create (no `shelf`) or edit (with `shelf`) dialog. */
function ShelfDialog({
  shelf,
  trigger,
  onSaved,
}: {
  shelf?: ShelfWithCount;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(shelf?.name ?? "");
  const [location, setLocation] = React.useState(shelf?.location ?? "");
  const [description, setDescription] = React.useState(
    shelf?.description ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        shelf ? `/api/shelves/${shelf.id}` : "/api/shelves",
        {
          method: shelf ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            location: location.trim() || null,
            description: description.trim() || null,
          }),
        },
      );
      if (!res.ok) throw new Error("save failed");
      setOpen(false);
      onSaved();
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {shelf ? "Editar estante" : "Nuevo estante"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="shelf-name">Nombre *</Label>
            <Input
              id="shelf-name"
              value={name}
              placeholder="Ej. Living · pared norte"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "shelf-name-err" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
            />
            {error && (
              <p id="shelf-name-err" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shelf-location">Ubicación</Label>
            <Input
              id="shelf-location"
              placeholder="Ej. pared norte, repisa alta"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shelf-description">Descripción</Label>
            <textarea
              id="shelf-description"
              rows={3}
              placeholder="Opcional — qué guardás acá"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={save}>
            {shelf ? "Guardar cambios" : "Crear estante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteShelfDialog({
  shelf,
  onDeleted,
}: {
  shelf: ShelfWithCount;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/shelves/${shelf.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setOpen(false);
      onDeleted();
    } catch {
      toast({ title: "No se pudo borrar", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Borrar estante"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Borrar «{shelf.name}»</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>
        {shelf.bookCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p>
              <strong className="font-semibold">
                {shelf.bookCount} {shelf.bookCount === 1 ? "libro" : "libros"}
              </strong>{" "}
              {shelf.bookCount === 1 ? "quedará" : "quedarán"} sin estante. No
              se borran los libros, solo el estante.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" loading={deleting} onClick={remove}>
            Borrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
