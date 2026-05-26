import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "Warehouse Now ATS - Talent Acquisition Platform",
  description: "Centralized Applicant Tracking System for Warehouse Now",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch {}
        ` }} />
      </head>
      <body className="min-h-full flex bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
        <CommandPalette />
      </body>
    </html>
  );
}
