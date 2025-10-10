import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking/BookingForm";
import { prisma } from "@/lib/prisma";

const DEFAULT_TENANT = "velora-hairstyles";

export default async function BookingPage({ searchParams }: { searchParams: { tenant?: string } }) {
  const tenantSlug = searchParams?.tenant ?? DEFAULT_TENANT;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      settings: true,
    },
  });

  if (!tenant || !tenant.settings) {
    notFound();
  }

  const { businessName, businessHours, holidays } = tenant.settings;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Buchung für {businessName}</h1>
        <p className="text-muted-foreground">
          Wähle deinen Wunschtermin – wir melden uns zur Bestätigung.
        </p>
      </div>
      <BookingForm
        tenant={tenant.slug}
        businessName={businessName}
        businessHours={businessHours as any}
        holidays={(holidays as string[]) ?? []}
      />
    </div>
  );
}
