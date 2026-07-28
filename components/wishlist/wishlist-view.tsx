"use client";

import * as React from "react";
import {
  BookMarked,
  Check,
  ChevronDown,
  ChevronsUp,
  Home,
  Library,
  Minus,
  Plus,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { WriteCta } from "@/components/auth/write-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AddWishDialog } from "@/components/wishlist/add-wish-dialog";
import { wantToReadFor, wantToBuy, isOwned } from "@/services/wishlist/views";
import type { WishlistItem, WishlistPriority } from "@/lib/types/wishlist-item";
import type { ReadingEvent } from "@/lib/types/reading-event";
import type { Copy } from "@/lib/types/copy";
import type { Book } from "@/lib/types/book";
import type { Reader } from "@/lib/types/reader";
import type { Shelf } from "@/lib/types/shelf";

type Tab = "leer" | "comprar";

const PRIORITIES: {
  key: WishlistPriority;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "high", label: "Alta", icon: <ChevronsUp aria-hidden="true" /> },
  { key: "normal", label: "Normal", icon: <Minus aria-hidden="true" /> },
  { key: "low", label: "Baja", icon: <ChevronDown aria-hidden="true" /> },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function listJson<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * The Deseos screen (#37) — two views over one wishlist: **Quiero leer** (the active
 * reader's list) and **Comprar** (the household buy list). Both memberships are
 * derived, never stored, so they self-maintain: reading a book drops it from
 * "leer", owning a copy drops it from "comprar". Realizes `Deseos.dc.html`.
 */
export function WishlistView({ initialTab }: { initialTab: Tab }) {
  const { reader } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>(initialTab);

  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [events, setEvents] = React.useState<ReadingEvent[]>([]);
  const [copies, setCopies] = React.useState<Copy[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [readers, setReaders] = React.useState<Reader[]>([]);
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [addOpen, setAddOpen] = React.useState(false);
  const [buyItem, setBuyItem] = React.useState<WishlistItem | null>(null);

  const reload = React.useCallback(async () => {
    const [i, e, c, b, r, s] = await Promise.all([
      listJson<WishlistItem>("/api/wishlist-items"),
      listJson<ReadingEvent>("/api/reading-events"),
      listJson<Copy>("/api/copies"),
      listJson<Book>("/api/books"),
      listJson<Reader>("/api/readers"),
      listJson<Shelf>("/api/shelves"),
    ]);
    setItems(i);
    setEvents(e);
    setCopies(c);
    setBooks(b);
    setReaders(r);
    setShelves(s);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    // Data fetch on mount populates state after the awaited loads resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const readerName = (id: string) =>
    readers.find((r) => r.id === id)?.name ?? "Alguien";

  const wantToRead = reader ? wantToReadFor(reader.id, items, events) : [];
  const buyGroups = wantToBuy(items, copies, books);

  // ---- mutations (optimistic, then reconcile) ---------------------------------

  async function setPriority(id: string, priority: WishlistPriority) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, priority } : it)),
    );
    try {
      await fetch(`/api/wishlist-items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    } catch {
      void reload();
    }
  }

  async function patchStatus(id: string, status: "wanted" | "dismissed") {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
    try {
      await fetch(`/api/wishlist-items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      void reload();
    }
  }

  function dismiss(item: WishlistItem) {
    void patchStatus(item.id, "dismissed");
    toast({
      title: `Descartaste «${item.bookTitle}»`,
      action: (
        <ToastAction
          altText="Deshacer"
          onClick={() => void patchStatus(item.id, "wanted")}
        >
          Deshacer
        </ToastAction>
      ),
    });
  }

  async function markRead(item: WishlistItem) {
    if (!reader) return;
    // A wish leaves "quiero leer" when a finished reading exists for that book. The
    // event needs a bookId; a loose wish gets a bare Book (no Copy — a read book is
    // not necessarily owned) created from its snapshot first.
    try {
      let bookId = item.bookId ?? null;
      if (!bookId) {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: item.bookTitle,
            authors: item.bookAuthors,
            isbn13: item.isbn13 ?? null,
            coverUrl: item.coverUrl ?? null,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        bookId = ((await res.json()) as Book).id;
      }
      const ev = await fetch("/api/reading-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          readerId: reader.id,
          bookId,
          status: "finished",
          dateFinished: new Date().toISOString(),
        }),
      });
      if (!ev.ok) throw new Error(String(ev.status));
      toast({ title: `«${item.bookTitle}» pasó a tus lecturas` });
      await reload();
    } catch {
      toast({
        title: "No se pudo registrar la lectura",
        variant: "destructive",
      });
    }
  }

  async function acquire(item: WishlistItem, shelfId: string | null) {
    setBuyItem(null);
    try {
      const res = await fetch(`/api/wishlist-items/${item.id}/acquire`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(shelfId ? { shelfId } : {}),
      });
      if (!res.ok) throw new Error(String(res.status));
      const shelfName = shelves.find((s) => s.id === shelfId)?.name;
      toast({
        title: shelfName
          ? `«${item.bookTitle}» ya está en ${shelfName}`
          : `«${item.bookTitle}» ya está en casa`,
      });
      await reload();
    } catch {
      toast({
        title: "No se pudo registrar la compra",
        variant: "destructive",
      });
    }
  }

  // ---- render -----------------------------------------------------------------

  const scopeLine =
    tab === "leer"
      ? reader
        ? `Lo que ${reader.name} quiere leer — ${wantToRead.length} ${
            wantToRead.length === 1 ? "libro" : "libros"
          }`
        : ""
      : "De la casa · nadie tiene estos todavía";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Deseos</h1>
        {reader ? (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAddOpen(true)}
              aria-label="Agregar a deseos"
            >
              <Plus aria-hidden="true" />
            </Button>
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-label={`Lista de ${reader.name}`}
            >
              {initials(reader.name)}
            </span>
          </>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Vistas de Deseos"
        className="flex gap-1 rounded-xl bg-muted p-1"
      >
        <TabButton
          selected={tab === "leer"}
          onClick={() => setTab("leer")}
          icon={<BookMarked className="size-4" aria-hidden="true" />}
        >
          Quiero leer
        </TabButton>
        <TabButton
          selected={tab === "comprar"}
          onClick={() => setTab("comprar")}
          icon={<ShoppingCart className="size-4" aria-hidden="true" />}
        >
          Comprar
        </TabButton>
      </div>

      {scopeLine ? (
        <p className="px-1 text-xs text-muted-foreground">{scopeLine}</p>
      ) : null}

      <div
        role="tabpanel"
        aria-label={tab === "leer" ? "Quiero leer" : "Comprar"}
      >
        {loading ? null : tab === "leer" ? (
          !reader ? (
            <EmptyState
              icon={<BookMarked />}
              title="Tu lista de «quiero leer»"
              description="Iniciá sesión para ver y armar tu lista de deseos."
              action={<WriteCta label="Ver mis deseos" />}
            />
          ) : wantToRead.length === 0 ? (
            <EmptyState
              icon={<BookMarked />}
              title="Todavía no querés leer nada 👀"
              description="Anotá lo próximo que tengas ganas de leer — a mano, escaneando un ISBN o desde un libro del catálogo."
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <Plus aria-hidden="true" />
                  Agregar a deseos
                </Button>
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {wantToRead.map((item) => (
                  <WishCard
                    key={item.id}
                    item={item}
                    owned={isOwned(item, copies, books)}
                    onPriority={(p) => setPriority(item.id, p)}
                    onRead={() => markRead(item)}
                    onDismiss={() => dismiss(item)}
                  />
                ))}
              </ul>
              <p className="mt-4 px-2 text-center text-xs leading-relaxed text-muted-foreground">
                Se van solos cuando los terminás o los abandonás.
              </p>
            </>
          )
        ) : buyGroups.length === 0 ? (
          <EmptyState
            icon={<Home />}
            title="Nada por comprar 🎉"
            description="Todo lo que quieren leer ya está en casa."
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {buyGroups.map((group) => (
                <BuyCard
                  key={group.representative.id}
                  title={group.representative.bookTitle}
                  authors={group.representative.bookAuthors.join(", ")}
                  coverUrl={group.representative.coverUrl}
                  priority={group.priority}
                  wanterNames={group.readerIds.map(readerName)}
                  onBuy={() => setBuyItem(group.representative)}
                />
              ))}
            </ul>
            <p className="mt-4 px-2 text-center text-xs leading-relaxed text-muted-foreground">
              Un libro sale de acá apenas hay un ejemplar en casa.
            </p>
          </>
        )}
      </div>

      {reader ? (
        <AddWishDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          readerId={reader.id}
          onAdded={reload}
        />
      ) : null}

      <ShelfSheet
        item={buyItem}
        shelves={shelves}
        onPick={(shelfId) => buyItem && acquire(buyItem, shelfId)}
        onClose={() => setBuyItem(null)}
      />
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-card font-bold text-foreground shadow-sm"
          : "font-semibold text-muted-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Cover({
  coverUrl,
  title,
}: {
  coverUrl?: string | null;
  title: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt=""
        aria-hidden="true"
        className="h-[70px] w-12 flex-none rounded-lg object-cover shadow-md"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      title={title}
      className="grid h-[70px] w-12 flex-none place-items-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground"
    >
      <BookMarked className="size-5" />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: WishlistPriority }) {
  const p = PRIORITIES.find((x) => x.key === priority)!;
  const high = priority === "high";
  return (
    <Badge variant={high ? "secondary" : "outline"}>
      {p.icon}
      {p.label}
    </Badge>
  );
}

function WishCard({
  item,
  owned,
  onPriority,
  onRead,
  onDismiss,
}: {
  item: WishlistItem;
  owned: boolean;
  onPriority: (p: WishlistPriority) => void;
  onRead: () => void;
  onDismiss: () => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex gap-3">
        <Cover coverUrl={item.coverUrl} title={item.bookTitle} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">
            {item.bookTitle}
          </div>
          {item.bookAuthors.length ? (
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {item.bookAuthors.join(", ")}
            </div>
          ) : null}
          {owned ? (
            <Badge variant="secondary" className="mt-2">
              <Home aria-hidden="true" />
              En casa
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Prioridad
        </div>
        <div
          role="radiogroup"
          aria-label={`Prioridad de «${item.bookTitle}»`}
          className="flex gap-0.5 rounded-[11px] bg-muted p-0.5"
        >
          {PRIORITIES.map((p) => {
            const on = item.priority === p.key;
            const high = on && p.key === "high";
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={p.label}
                onClick={() => onPriority(p.key)}
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
                  high
                    ? "bg-accent font-bold text-accent-foreground shadow-sm"
                    : on
                      ? "bg-card font-bold text-foreground shadow-sm"
                      : "font-medium text-muted-foreground",
                )}
              >
                {p.icon}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1"
          onClick={onRead}
          aria-label={`Marcar «${item.bookTitle}» como leído`}
        >
          <Check aria-hidden="true" />
          Marcar leído
        </Button>
        <Button
          variant="ghost"
          className="h-11 text-muted-foreground"
          onClick={onDismiss}
          aria-label={`Descartar «${item.bookTitle}» de deseos`}
        >
          <X aria-hidden="true" />
          Descartar
        </Button>
      </div>
    </li>
  );
}

function BuyCard({
  title,
  authors,
  coverUrl,
  priority,
  wanterNames,
  onBuy,
}: {
  title: string;
  authors: string;
  coverUrl?: string | null;
  priority: WishlistPriority;
  wanterNames: string[];
  onBuy: () => void;
}) {
  const both = wanterNames.length > 1;
  return (
    <li
      className={cn(
        "rounded-2xl bg-card p-3.5",
        both ? "border-[1.5px] border-primary" : "border border-border",
      )}
    >
      <div className="flex gap-3">
        <Cover coverUrl={coverUrl} title={title} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">{title}</div>
          {authors ? (
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {authors}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={priority} />
            {both ? (
              <Badge>
                <Users aria-hidden="true" />
                Los dos
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-[11px] bg-muted p-2.5">
        <div aria-hidden="true" className="flex">
          {wanterNames.map((name, i) => (
            <span
              key={name + i}
              className={cn(
                "grid size-7 place-items-center rounded-full border-2 border-card text-[11px] font-semibold",
                i === 0 ? "" : "-ml-2",
                "bg-accent text-accent-foreground",
              )}
            >
              {initials(name)}
            </span>
          ))}
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          <strong className="font-semibold text-foreground">Lo quieren:</strong>{" "}
          {wanterNames.join(", ")}
        </span>
      </div>

      <Button
        className="mt-3 h-11 w-full"
        onClick={onBuy}
        aria-label={`Marcar «${title}» como comprado`}
      >
        <Check aria-hidden="true" />
        Lo compré
      </Button>
    </li>
  );
}

function ShelfSheet({
  item,
  shelves,
  onPick,
  onClose,
}: {
  item: WishlistItem | null;
  shelves: Shelf[];
  onPick: (shelfId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿A qué estante va?</DialogTitle>
          <DialogDescription>
            Opcional — un ejemplar sin estante también es válido.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {shelves.map((shelf) => (
            <Button
              key={shelf.id}
              variant="outline"
              className="h-12 justify-start"
              onClick={() => onPick(shelf.id)}
            >
              <Library aria-hidden="true" />
              {shelf.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="h-12 text-muted-foreground"
            onClick={() => onPick(null)}
          >
            Sin estante por ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
