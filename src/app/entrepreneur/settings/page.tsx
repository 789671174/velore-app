import { notFound } from "next/navigation";

import { getTenantSlug, getSettingsByTenantSlug } from "@/app/lib/tenant";
import SettingsView from "./SettingsView";

type PageProps = {
  searchParams?: { t?: string; tenant?: string };
};

export default async function EntrepreneurSettingsPage({ searchParams }: PageProps) {
  const slug = getTenantSlug(searchParams);
  const settings = await getSettingsByTenantSlug(slug);
  if (!settings) {
    notFound();
  }

  return <SettingsView tenantSlug={slug} initialSettings={settings} />;
}
