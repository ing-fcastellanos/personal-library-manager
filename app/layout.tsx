import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Library Manager",
  description: "AI-assisted personal library management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
