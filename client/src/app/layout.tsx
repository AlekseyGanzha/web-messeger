import type { Metadata } from "next";
import "./globals.css";
import { THEME_SCRIPT } from "@/shared/lib/theme";

export const metadata: Metadata = {
  title: "Web Messager",
  description: "Small WhatsApp-like messenger",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
