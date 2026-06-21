import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/shell/app-shell";
import { Toaster } from "@/components/ui/sonner";

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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
