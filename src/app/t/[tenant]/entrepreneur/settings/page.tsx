import { notFound } from "next/navigation";

import SettingsView from "@/app/entrepreneur/settings/SettingsView";
import { getSettingsByTenantSlug, normalizeTenantSlug } from "@/app/lib/tenant";

type PageProps = {
  params: {
    tenant?: string;
  };
};

export default async function TenantEntrepreneurSettingsPage({ params }: PageProps) {
  const slug = normalizeTenantSlug(params?.tenant);
  if (!slug) {
    notFound();
  }

  const settings = await getSettingsByTenantSlug(slug);
  if (!settings) {
    notFound();
  }

  return <SettingsView tenantSlug={slug} initialSettings={settings} />;
}
