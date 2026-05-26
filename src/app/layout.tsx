import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
