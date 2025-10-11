import { notFound } from "next/navigation";

import SettingsView from "@/app/entrepreneur/settings/SettingsView";
import { ensureBusinessWithSettings } from "@/app/lib/tenant";

type Props = {
  params: {
    tenant?: string;
  };
};

export default async function TenantEntrepreneurSettingsPage({ params }: Props) {
  const slug = params?.tenant?.trim().toLowerCase();
  if (!slug) {
    notFound();
  }

  const { business, settings } = await ensureBusinessWithSettings(slug);

  return (
    <SettingsView
      tenant={slug}
      business={business}
      initialSettings={settings}
    />
  );
}
