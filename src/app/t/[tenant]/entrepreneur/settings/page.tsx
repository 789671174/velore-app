import { notFound } from "next/navigation";

import { BusinessSettingsForm } from "@/components/settings/BusinessSettingsForm";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { settingsSchema } from "@/lib/validators/settings";

interface SettingsPageProps {
  params: { tenant: string };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const tenant = await ensureTenantWithSettings(params.tenant);

  if (!tenant || !tenant.settings) {
    notFound();
  }

  const parsed = settingsSchema.parse({
    businessName: tenant.settings.businessName,
    email: tenant.settings.email,
    phone: tenant.settings.phone ?? "",
    address: tenant.settings.address ?? "",
    notes: tenant.settings.notes ?? "",
    businessHours: tenant.settings.businessHours as any,
    holidays: (tenant.settings.holidays as string[]) ?? [],
  });

  const orderedHours = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) =>
    parsed.businessHours.find((item) => item.day === day) ?? {
      day: day as (typeof parsed.businessHours)[number]["day"],
      enabled: false,
      open: "09:00",
      close: "17:00",
      breaks: [],
    },
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Passe Öffnungszeiten, Sondertage und Unternehmensdaten für {tenant.name} an.
        </p>
      </div>
      <BusinessSettingsForm tenant={tenant.slug} initialData={{ ...parsed, businessHours: orderedHours }} />
    </div>
  );
}
