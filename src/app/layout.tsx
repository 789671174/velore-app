import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salon CRM",
  description: "Minimal routes for /client and /entrepreneur"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <nav>
          <a href="/">Start</a>
          <a href="/client">Client</a>
          <a href="/entrepreneur">Entrepreneur</a>
        </nav>
        {children}
        <footer>© {new Date().getFullYear()} Salon CRM</footer>
      </body>
    </html>
  );
}
