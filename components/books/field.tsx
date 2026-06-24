"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Centered single-column shell used by the loading/error/success/search panels. */
export function FieldShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>{children}</div>
  );
}

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  /** When set, renders an inline error tied to the input via `${id}-error`. */
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + inline error, wired for a11y. The control inside must set
 * `aria-describedby={`${id}-error`}` and `aria-invalid` when `error` is present.
 */
export function Field({
  id,
  label,
  required,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
