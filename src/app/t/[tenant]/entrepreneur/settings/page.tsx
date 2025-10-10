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
    phone: tenant.settings.phone,
    address: tenant.settings.address,
    notes: tenant.settings.notes,
    businessHours: tenant.settings.businessHours,
    holidays: tenant.settings.holidays,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Passe Öffnungszeiten, Sondertage und Unternehmensdaten für {tenant.name} an.
        </p>
      </div>
      <BusinessSettingsForm tenant={tenant.slug} initialData={parsed} />
    </div>
  );
}
