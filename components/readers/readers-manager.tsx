"use client";

import * as React from "react";
import type { Reader } from "@/lib/types/reader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ReadersManager() {
  const { toast } = useToast();
  const [readers, setReaders] = React.useState<Reader[] | null>(null);

  React.useEffect(() => {
    fetch("/api/readers")
      .then((res) => res.json())
      .then((data: Reader[]) => setReaders(data))
      .catch(() => setReaders([]));
  }, []);

  function handleSaved(updated: Reader) {
    setReaders(
      (prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null,
    );
    toast({ title: "Perfil actualizado", variant: "success" });
  }

  if (readers === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (readers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay lectores todavía. Corré el seed con{" "}
        <code>npm run seed:readers</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {readers.map((reader) => (
        <Card key={reader.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <Avatar>
              {reader.avatar ? <AvatarImage src={reader.avatar} alt="" /> : null}
              <AvatarFallback
                style={
                  reader.displayColor
                    ? { backgroundColor: reader.displayColor, color: "#fff" }
                    : undefined
                }
              >
                {initials(reader.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{reader.name}</p>
              {reader.goodreadsUrl ? (
                <a
                  href={reader.goodreadsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Goodreads
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Sin Goodreads</p>
              )}
            </div>
            <EditReaderDialog reader={reader} onSaved={handleSaved} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function EditReaderDialog({
  reader,
  onSaved,
}: {
  reader: Reader;
  onSaved: (reader: Reader) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(reader.name);
  const [avatar, setAvatar] = React.useState(reader.avatar ?? "");
  const [displayColor, setDisplayColor] = React.useState(
    reader.displayColor ?? "",
  );
  const [goodreadsUrl, setGoodreadsUrl] = React.useState(
    reader.goodreadsUrl ?? "",
  );
  const [email, setEmail] = React.useState(reader.email ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/readers/${reader.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatar: avatar || null,
          displayColor: displayColor || null,
          goodreadsUrl: goodreadsUrl || null,
          email: email || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      onSaved((await res.json()) as Reader);
      setOpen(false);
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar lector</DialogTitle>
          <DialogDescription>Actualizá el perfil del lector.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nombre" id="reader-name">
            <Input
              id="reader-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email (para magic-link)" id="reader-email">
            <Input
              id="reader-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@gmail.com"
            />
          </Field>
          <Field label="Avatar (URL)" id="reader-avatar">
            <Input
              id="reader-avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Color" id="reader-color">
            <Input
              id="reader-color"
              value={displayColor}
              onChange={(e) => setDisplayColor(e.target.value)}
              placeholder="#6f5436"
            />
          </Field>
          <Field label="Goodreads URL" id="reader-goodreads">
            <Input
              id="reader-goodreads"
              value={goodreadsUrl}
              onChange={(e) => setGoodreadsUrl(e.target.value)}
              placeholder="https://www.goodreads.com/user/show/…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
