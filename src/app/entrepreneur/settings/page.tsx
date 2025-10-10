import { getTenantSlug, ensureBusinessWithSettings } from "@/app/lib/tenant";
import SettingsView from "./SettingsView";

export default async function EntrepreneurSettingsPage({ searchParams }: { searchParams?: { t?: string } }) {
  const slug = getTenantSlug(searchParams);
  const { business, settings } = await ensureBusinessWithSettings(slug);

  return (
    <SettingsView
      tenant={slug}
      business={business}
      initialSettings={settings}
    />
  );
}
