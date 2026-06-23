import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ShelfProvider } from "@/components/shelf/shelf-context";
import { LockProvider, LockGate } from "@/components/auth/lock-context";
import { AppShell } from "@/components/shell/app-shell";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Personal Library Manager",
  description: "AI-assisted personal library management system",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Library" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#211d18" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ShelfProvider>
              <LockProvider>
                <LockGate>
                  <AppShell>{children}</AppShell>
                </LockGate>
              </LockProvider>
            </ShelfProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
