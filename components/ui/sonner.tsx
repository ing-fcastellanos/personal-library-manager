"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** App toast surface (sonner), theme-aware. Mount once in the root layout. */
function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      {...props}
    />
  );
}

export { Toaster };
