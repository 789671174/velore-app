import { getTenantSlug, ensureBusinessWithSettings } from "@/app/lib/tenant";
import SettingsView from "./SettingsView";

export default async function EntrepreneurSettingsPage({ searchParams }: { searchParams?: { t?: string } }) {
  const slug = getTenantSlug(searchParams);
  const { business, settings } = await ensureBusinessWithSettings(slug);

  const safeBusiness = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    email: business.email ?? null,
    logoDataUrl: business.logoDataUrl ?? null,
  };

  const safeSettings = {
    id: settings.id,
    slotMinutes: settings.slotMinutes,
    bufferMinutes: settings.bufferMinutes,
    hoursJson: settings.hoursJson ?? "{}",
    workDaysJson: settings.workDaysJson ?? "[]",
    vacationDaysJson: settings.vacationDaysJson ?? "[]",
    bookingNotes: settings.bookingNotes ?? null,
  };

  return (
    <SettingsView
      tenant={business.slug}
      business={safeBusiness}
      initialSettings={safeSettings}
    />
  );
}
