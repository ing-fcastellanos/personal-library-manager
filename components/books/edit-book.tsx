"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditBookForm } from "./edit-book-form";
import { type FieldDiff } from "./re-enrich-dialog";
import { type BookData, type CopyData, type Shelf, LANGUAGES } from "./types";
import type { Book } from "@/lib/types/book";
import type { Copy } from "@/lib/types/copy";

/**
 * Connected edit-book container (#15). Wires the presentational `EditBookForm`
 * (Claude Design handoff) to the real catalog APIs: load Book + Copy (#12),
 * re-enrich diff (#13), cover upload (#15), and PATCH persistence (#12). Cover
 * provenance (`coverSource`) is tracked so re-enrich preserves a user upload.
 */

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
};

function languageLabel(value?: string | null): string {
  if (!value) return "Español";
  if ((LANGUAGES as readonly string[]).includes(value)) return value;
  return LANGUAGE_LABELS[value.toLowerCase()] ?? "Otro";
}

function bookToData(b: Book): BookData {
  return {
    title: b.title ?? "",
    subtitle: b.subtitle ?? undefined,
    authors: b.authors ?? [],
    publisher: b.publisher ?? undefined,
    year: b.publishedYear != null ? String(b.publishedYear) : undefined,
    isbn13: b.isbn13 ?? undefined,
    isbn10: b.isbn10 ?? undefined,
    categories: b.categories ?? [],
    language: languageLabel(b.language),
    pages: b.pageCount != null ? String(b.pageCount) : undefined,
    description: b.description ?? undefined,
    coverUrl: b.coverUrl ?? undefined,
  };
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function EditBook({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const copyId = React.useRef<string | null>(null);
  const coverSource = React.useRef<"metadata" | "user" | null>(null);

  React.useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) =>
        setShelves(data.map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => setShelves([]));
  }, []);

  const onLoad = React.useCallback(
    async (id: string): Promise<{ book: BookData; copy: CopyData }> => {
      const [b, copies] = await Promise.all([
        fetch(`/api/books/${id}`).then((r) => r.json() as Promise<Book>),
        fetch(`/api/books/${id}/copies`).then(
          (r) => r.json() as Promise<Copy[]>,
        ),
      ]);
      coverSource.current = b.coverSource ?? null;
      const first = copies[0];
      copyId.current = first?.id ?? null;
      return {
        book: bookToData(b),
        copy: first
          ? {
              shelfId: first.shelfId ?? undefined,
              condition: first.condition ?? undefined,
              acquiredAt: first.acquiredAt ?? undefined,
              notes: first.notes ?? undefined,
            }
          : {},
      };
    },
    [],
  );

  const onUploadCover = React.useCallback(
    async (file: File): Promise<string> => {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch(`/api/books/${bookId}/cover`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, contentType: file.type }),
      });
      if (!res.ok) throw new Error("upload failed");
      coverSource.current = "user";
      return ((await res.json()) as { coverUrl: string }).coverUrl;
    },
    [bookId],
  );

  const onReEnrich = React.useCallback(
    async (book: BookData): Promise<FieldDiff[]> => {
      if (!book.isbn13?.trim()) return [];
      const { candidate } = (await fetch(
        `/api/enrich?isbn=${encodeURIComponent(book.isbn13.trim())}`,
      ).then((r) => r.json())) as {
        candidate: Record<string, unknown> | null;
      };
      if (!candidate) return [];

      const diffs: FieldDiff[] = [];
      const text = (
        key: keyof BookData,
        label: string,
        mine: string | undefined,
        source: unknown,
      ) => {
        const src = source == null ? "" : String(source);
        if (!src || (mine ?? "") === src) return;
        diffs.push({
          key,
          label,
          mine: mine || "—",
          source: src,
          sourceValue: src,
        });
      };
      const list = (
        key: keyof BookData,
        label: string,
        mine: string[],
        source: unknown,
      ) => {
        if (!Array.isArray(source)) return;
        const srcArr = source as string[];
        if (JSON.stringify(mine) === JSON.stringify(srcArr)) return;
        diffs.push({
          key,
          label,
          mine: mine.join(", ") || "—",
          source: srcArr.join(", "),
          sourceValue: srcArr,
        });
      };

      text("title", "Título", book.title, candidate.title);
      text("publisher", "Editorial", book.publisher, candidate.publisher);
      text(
        "year",
        "Año",
        book.year,
        candidate.publishedYear != null ? String(candidate.publishedYear) : "",
      );
      text(
        "description",
        "Descripción",
        book.description,
        candidate.description,
      );
      list("authors", "Autores", book.authors, candidate.authors);
      list("categories", "Categorías", book.categories, candidate.categories);
      // A user-uploaded cover is preserved (#15 D5): not offered in the diff.
      if (coverSource.current !== "user" && candidate.coverUrl) {
        const src = String(candidate.coverUrl);
        if (src !== (book.coverUrl ?? "")) {
          diffs.push({
            key: "cover",
            label: "Portada",
            mine: book.coverUrl ? "Actual" : "—",
            source: "De la fuente",
            sourceValue: src,
          });
        }
      }
      return diffs;
    },
    [],
  );

  const onSave = React.useCallback(
    async (id: string, book: BookData, copy: CopyData): Promise<void> => {
      const bookBody: Record<string, unknown> = {
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
        coverUrl: book.coverUrl ?? null,
      };
      // Only reset coverSource when the cover was removed; otherwise keep what
      // the server has (e.g. "user" from a just-completed upload).
      if (!book.coverUrl) bookBody.coverSource = null;

      const reqs: Promise<Response>[] = [
        fetch(`/api/books/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(bookBody),
        }),
      ];
      if (copyId.current) {
        reqs.push(
          fetch(`/api/copies/${copyId.current}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              shelfId: copy.shelfId || null,
              condition: copy.condition?.trim() || null,
              acquiredAt: copy.acquiredAt || null,
              notes: copy.notes?.trim() || null,
            }),
          }),
        );
      }
      const results = await Promise.all(reqs);
      if (results.some((r) => !r.ok)) throw new Error("save failed");
    },
    [],
  );

  return (
    <EditBookForm
      bookId={bookId}
      shelves={shelves}
      onLoad={onLoad}
      onUploadCover={onUploadCover}
      onReEnrich={onReEnrich}
      onSave={onSave}
      onDone={() => router.push("/catalogo")}
    />
  );
}
