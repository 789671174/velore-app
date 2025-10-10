import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import "@/app/globals.css";

import { ThemeToggle } from "@/components/theme-toggle";
import { Providers } from "@/components/providers";
import { AppToaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Velore – Buchungsplattform",
  description: "Multi-Tenant Terminverwaltung für Salons",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={cn("bg-background font-sans text-foreground", inter.variable)}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b bg-background/80 backdrop-blur">
              <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="text-lg font-semibold">
                  Velore
                </Link>
                <div className="flex items-center gap-3">
                  <nav className="hidden items-center gap-3 text-sm font-medium md:flex">
                    <Link href="/booking">Buchung</Link>
                    <Link href="/t/velora-hairstyles/entrepreneur">Dashboard</Link>
                    <Link href="/t/velora-hairstyles/entrepreneur/settings">Einstellungen</Link>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="flex-1">
              <div className="container py-10">{children}</div>
            </main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Velore. Alle Rechte vorbehalten.
            </footer>
          </div>
          <AppToaster />
        </Providers>
      </body>
    </html>
  );
}
