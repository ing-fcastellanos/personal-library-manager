"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Field } from "./field";
import { TokenField } from "./token-field";
import { type BookData, LANGUAGES } from "./types";

export interface BookFieldsProps {
  value: BookData;
  onChange: (next: BookData) => void;
  /** Per-field validation errors (only `title` today). */
  errors?: { title?: string };
  /** Clear an error as the user edits. */
  onClearError?: (key: "title") => void;
  /** Prefix to keep input ids unique when two forms mount at once. */
  idPrefix?: string;
}

/**
 * The shared Book metadata fields (título … descripción). Reused by the add
 * (#14) and edit screens — identical layout, no search/candidate concerns.
 */
export function BookFields({
  value,
  onChange,
  errors = {},
  onClearError,
  idPrefix = "b",
}: BookFieldsProps) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const set = <K extends keyof BookData>(k: K, v: BookData[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-col gap-4">
      <Field id={id("title")} label="Título" required error={errors.title}>
        <Input
          id={id("title")}
          value={value.title}
          onChange={(e) => {
            set("title", e.target.value);
            if (errors.title) onClearError?.("title");
          }}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? `${id("title")}-error` : undefined}
          className={cn("h-11", errors.title && "border-destructive")}
        />
      </Field>

      <Field id={id("sub")} label="Subtítulo">
        <Input
          id={id("sub")}
          value={value.subtitle ?? ""}
          onChange={(e) => set("subtitle", e.target.value)}
          placeholder="—"
          className="h-11"
        />
      </Field>

      <Field id={id("authors")} label="Autores">
        <TokenField
          value={value.authors}
          ariaLabel="Agregar autor"
          onChange={(v) => set("authors", v)}
        />
      </Field>

      <div className="flex gap-3">
        <Field id={id("pub")} label="Editorial" className="flex-1">
          <Input
            id={id("pub")}
            value={value.publisher ?? ""}
            onChange={(e) => set("publisher", e.target.value)}
            className="h-11"
          />
        </Field>
        <Field id={id("year")} label="Año" className="w-24 shrink-0">
          <Input
            id={id("year")}
            inputMode="numeric"
            value={value.year ?? ""}
            onChange={(e) => set("year", e.target.value)}
            className="h-11"
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Field id={id("i13")} label="ISBN-13" className="flex-1">
          <Input
            id={id("i13")}
            inputMode="numeric"
            value={value.isbn13 ?? ""}
            onChange={(e) => set("isbn13", e.target.value)}
            className="h-11 font-mono text-sm"
          />
        </Field>
        <Field id={id("i10")} label="ISBN-10" className="flex-1">
          <Input
            id={id("i10")}
            inputMode="numeric"
            value={value.isbn10 ?? ""}
            onChange={(e) => set("isbn10", e.target.value)}
            className="h-11 font-mono text-sm"
          />
        </Field>
      </div>

      <Field id={id("cats")} label="Categorías">
        <TokenField
          value={value.categories}
          ariaLabel="Agregar categoría"
          onChange={(v) => set("categories", v)}
        />
      </Field>

      <div className="flex gap-3">
        <Field id={id("lang")} label="Idioma" className="flex-1">
          <Select
            value={value.language}
            onValueChange={(v) => set("language", v)}
          >
            <SelectTrigger id={id("lang")} className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id={id("pages")} label="Páginas" className="w-24 shrink-0">
          <Input
            id={id("pages")}
            inputMode="numeric"
            value={value.pages ?? ""}
            onChange={(e) => set("pages", e.target.value)}
            className="h-11"
          />
        </Field>
      </div>

      <Field id={id("desc")} label="Descripción">
        <textarea
          id={id("desc")}
          rows={3}
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </Field>
    </div>
  );
}
