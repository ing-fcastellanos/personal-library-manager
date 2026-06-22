"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { ReaderPicker } from "@/components/readers/reader-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

const tokenSwatches = [
  "background",
  "card",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "success",
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ReaderPickerDemo() {
  const [picked, setPicked] = React.useState<string | null>(null);
  return <ReaderPicker value={picked} onChange={setPicked} />;
}

export default function StyleGuidePage() {
  const { toast } = useToast();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Style guide</h1>
        <p className="text-muted-foreground">
          Referencia viva de tokens y primitivos (ADR-0010). Los handoffs de
          Claude Design apuntan a esto.
        </p>
      </div>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tokenSwatches.map((token) => (
            <div key={token} className="space-y-1">
              <div
                className="h-12 rounded-md border"
                style={{ backgroundColor: `rgb(var(--${token}))` }}
              />
              <p className="text-xs text-muted-foreground">{token}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reader picker">
        <ReaderPickerDemo />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="demo">Título</Label>
          <Input id="demo" placeholder="Cien años de soledad" />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Leído</Badge>
          <Badge variant="destructive">Pendiente</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description.</CardDescription>
          </CardHeader>
          <CardContent>Contenido de la card.</CardContent>
        </Card>
      </Section>

      <Section title="Skeleton">
        <div className="max-w-sm space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={<Inbox />}
          title="Sin resultados"
          description="No hay nada para mostrar todavía."
        />
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="a" className="max-w-sm">
          <TabsList>
            <TabsTrigger value="a">Uno</TabsTrigger>
            <TabsTrigger value="b">Dos</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel uno</TabsContent>
          <TabsContent value="b">Panel dos</TabsContent>
        </Tabs>
      </Section>

      <Section title="Overlays & inputs">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog accesible</DialogTitle>
                <DialogDescription>
                  Con foco gestionado y cierre por Escape.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novela">Novela</SelectItem>
              <SelectItem value="ensayo">Ensayo</SelectItem>
              <SelectItem value="poesia">Poesía</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menú</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Avatar>
            <AvatarFallback>FC</AvatarFallback>
          </Avatar>

          <Button
            onClick={() =>
              toast({
                title: "Libro agregado",
                description: "Cien años de soledad",
                variant: "success",
              })
            }
          >
            Toast
          </Button>
        </div>
      </Section>
    </div>
  );
}
