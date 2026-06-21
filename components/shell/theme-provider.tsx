"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps the app with class-based light/dark theming (toggles `.dark` on <html>).
 * Add `suppressHydrationWarning` to <html> in app/layout.tsx.
 *
 *   <html lang="es" suppressHydrationWarning>
 *     <body>
 *       <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 *         {children}
 *       </ThemeProvider>
 *     </body>
 *   </html>
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
