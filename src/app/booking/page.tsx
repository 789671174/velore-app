import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking/BookingForm";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { type BusinessHour } from "@/lib/time";
import { settingsSchema } from "@/lib/validators/settings";

const DEFAULT_TENANT = "velora-hairstyles";

const bookingSettingsSchema = settingsSchema.pick({
  businessName: true,
  businessHours: true,
  holidays: true,
});

export default async function BookingPage({ searchParams }: { searchParams: { tenant?: string } }) {
  const tenantSlug = searchParams?.tenant ?? DEFAULT_TENANT;
  const tenant = await ensureTenantWithSettings(tenantSlug);

  if (!tenant || !tenant.settings) {
    notFound();
  }

  const { businessName, businessHours, holidays } = bookingSettingsSchema.parse({
    businessName: tenant.settings.businessName,
    businessHours: tenant.settings.businessHours,
    holidays: (tenant.settings.holidays as string[]) ?? [],
  });

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
        businessHours={businessHours as BusinessHour[]}
        holidays={holidays}
      />
    </div>
  );
}
