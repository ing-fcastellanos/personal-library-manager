"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useShelf } from "@/components/shelf/shelf-context";
import { useToast } from "@/components/ui/use-toast";
import { AddBookForm } from "./add-book-form";
import {
  type BookData,
  type BookCandidate,
  type CopyData,
  type ExistingBook,
  type Shelf,
} from "./types";

/**
 * Connected "agregar libro" container (#14). Wires the presentational
 * `AddBookForm` (Claude Design handoff) to the real catalog APIs: enrichment
 * (#13), duplicate pre-check (#16), and the composite intake/copy endpoints
 * (#14/#12). The form owns all UI/flow; this owns the data plumbing.
 */

/** Maps an enrichment candidate (from /api/enrich) to the form's BookData. */
interface EnrichCandidate {
  title: string;
  subtitle?: string | null;
  authors?: string[];
  publisher?: string | null;
  publishedYear?: number | null;
  isbn13?: string | null;
  isbn10?: string | null;
  categories?: string[];
  coverUrl?: string | null;
  pageCount?: number | null;
  language?: string | null;
  description?: string | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
};

function languageLabel(code?: string | null): string {
  if (!code) return "Español";
  return LANGUAGE_LABELS[code.toLowerCase()] ?? "Otro";
}

function candidateToBookData(c: EnrichCandidate): BookData {
  return {
    title: c.title ?? "",
    subtitle: c.subtitle ?? undefined,
    authors: c.authors ?? [],
    publisher: c.publisher ?? undefined,
    year: c.publishedYear != null ? String(c.publishedYear) : undefined,
    isbn13: c.isbn13 ?? undefined,
    isbn10: c.isbn10 ?? undefined,
    categories: c.categories ?? [],
    language: languageLabel(c.language),
    pages: c.pageCount != null ? String(c.pageCount) : undefined,
    description: c.description ?? undefined,
    coverUrl: c.coverUrl ?? undefined,
  };
}

function intakePayload(book: BookData, copy: CopyData) {
  return {
    book: {
      title: book.title.trim(),
      subtitle: book.subtitle?.trim() || null,
      authors: book.authors,
      publisher: book.publisher?.trim() || null,
      publishedYear: book.year ? Number(book.year) : null,
      isbn13: book.isbn13?.trim() || null,
      isbn10: book.isbn10?.trim() || null,
      categories: book.categories,
      language: book.language?.trim() || null,
      pageCount: book.pages ? Number(book.pages) : null,
      description: book.description?.trim() || null,
    },
    copy: {
      shelfId: copy.shelfId || null,
      condition: copy.condition?.trim() || null,
      acquiredAt: copy.acquiredAt || null,
      notes: copy.notes?.trim() || null,
    },
    coverSourceUrl: book.coverUrl ?? null,
  };
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export function AddBook() {
  const router = useRouter();
  const { toast } = useToast();
  const { shelf: scanShelf } = useShelf();
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [shelvesLoaded, setShelvesLoaded] = React.useState(false);
  // Candidates from a title search, keyed by the synthetic id handed to the form.
  const candidateStore = React.useRef(new Map<string, EnrichCandidate>());
  // The existing book a duplicate check last surfaced (target for "add as copy").
  const lastDuplicate = React.useRef<ExistingBook | null>(null);
  // Guards the stale-shelf toast (#32) against firing more than once for the
  // same scanned id.
  const notifiedShelfRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    fetch("/api/shelves")
      .then((res) => res.json())
      .then((data: { id: string; name: string }[]) =>
        setShelves(data.map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => setShelves([]))
      .finally(() => setShelvesLoaded(true));
  }, []);

  // A shelf QR (#33) can point at a shelf deleted since it was printed: once
  // the shelf list has loaded, tell the reader instead of silently dropping
  // the preselection. `shelvesLoaded` (not `shelves.length`) distinguishes
  // "haven't fetched yet" from "fetched, and the reader has zero shelves".
  React.useEffect(() => {
    if (!scanShelf || !shelvesLoaded) return;
    if (notifiedShelfRef.current === scanShelf) return;
    if (shelves.some((s) => s.id === scanShelf)) return;
    notifiedShelfRef.current = scanShelf;
    toast({ title: "Ese estante ya no existe" });
  }, [scanShelf, shelves, shelvesLoaded, toast]);

  async function onEnrichIsbn(isbn: string): Promise<BookData> {
    const { candidate } = (await jsonOrThrow(
      await fetch(`/api/enrich?isbn=${encodeURIComponent(isbn)}`),
    )) as { candidate: EnrichCandidate | null };
    if (!candidate) throw new Error("no metadata");
    return candidateToBookData(candidate);
  }

  async function onSearchTitle(query: string): Promise<BookCandidate[]> {
    const { candidates } = (await jsonOrThrow(
      await fetch(`/api/enrich?q=${encodeURIComponent(query)}`),
    )) as { candidates: EnrichCandidate[] };
    candidateStore.current.clear();
    return candidates.map((c, i) => {
      const id = String(i);
      candidateStore.current.set(id, c);
      return {
        id,
        title: c.title,
        authors: c.authors ?? [],
        year: c.publishedYear != null ? String(c.publishedYear) : undefined,
        coverUrl: c.coverUrl ?? undefined,
      };
    });
  }

  async function onResolveCandidate(id: string): Promise<BookData> {
    const candidate = candidateStore.current.get(id);
    if (!candidate) throw new Error("unknown candidate");
    return candidateToBookData(candidate);
  }

  async function onCheckDuplicate(
    book: BookData,
  ): Promise<ExistingBook | null> {
    const qs = new URLSearchParams();
    if (book.isbn13?.trim()) qs.set("isbn", book.isbn13.trim());
    if (book.title.trim()) qs.set("title", book.title.trim());
    book.authors.forEach((a) => qs.append("authors", a));
    const res = await fetch(`/api/books/duplicates?${qs.toString()}`);
    if (!res.ok) return null;
    const result = (await res.json()) as {
      matches: {
        book: { id: string; title: string; authors: string[] };
        existingCopies: number;
      }[];
    };
    const match = result.matches[0];
    if (!match) {
      lastDuplicate.current = null;
      return null;
    }
    const existing: ExistingBook = {
      id: match.book.id,
      title: match.book.title,
      authors: match.book.authors,
      copies: match.existingCopies,
    };
    lastDuplicate.current = existing;
    return existing;
  }

  async function onSave(
    book: BookData,
    copy: CopyData,
    asCopy: boolean,
  ): Promise<{ id: string; copies: number }> {
    if (asCopy) {
      const existing = lastDuplicate.current;
      if (!existing) throw new Error("no duplicate target");
      await jsonOrThrow(
        await fetch("/api/copies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            bookId: existing.id,
            shelfId: copy.shelfId || null,
            condition: copy.condition?.trim() || null,
            acquiredAt: copy.acquiredAt || null,
            notes: copy.notes?.trim() || null,
          }),
        }),
      );
      return { id: existing.id, copies: existing.copies + 1 };
    }

    const result = (await jsonOrThrow(
      await fetch("/api/books/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intakePayload(book, copy)),
      }),
    )) as { book: { id: string } };
    return { id: result.book.id, copies: 1 };
  }

  return (
    <AddBookForm
      shelves={shelves}
      onEnrichIsbn={onEnrichIsbn}
      onSearchTitle={onSearchTitle}
      onResolveCandidate={onResolveCandidate}
      onCheckDuplicate={onCheckDuplicate}
      onSave={onSave}
      onViewBook={(id) => router.push(`/libros/${id}`)}
      onEditExisting={(id) => router.push(`/libros/${id}/editar`)}
      initialShelfId={scanShelf ?? undefined}
    />
  );
}
