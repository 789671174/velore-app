import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="space-y-10 text-center">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Salon SaaS</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Dein moderner Terminplaner</h1>
        <p className="text-lg text-muted-foreground">
          Verwalte Buchungen, Öffnungszeiten und Feiertage in einer Plattform. Multi-Tenant ready
          für dein Team.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/booking">Termin buchen</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/t/velora-hairstyles/entrepreneur">Zum Dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
