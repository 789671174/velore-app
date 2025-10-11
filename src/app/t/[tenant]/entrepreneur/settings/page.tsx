// Server component: fetch tenant + settings on the server,
// pass safe defaults to the existing client SettingsView.

import { notFound } from "next/navigation";

import SettingsView from "./SettingsView"; // this is a CLIENT component
import { prisma } from "@/lib/db";
import { buildTenantSettingsPayload, normalizeTenantSlug } from "@/app/lib/tenant";

type Params = { params: { tenant?: string } };

export default async function SettingsPage({ params }: Params) {
  const slug = normalizeTenantSlug(params.tenant);
  if (!slug) {
    notFound();
  }

  const tenant = await prisma.business.findUnique({
    where: { slug },
  });

  if (!tenant) {
    notFound();
  }

  const settings = await prisma.settings.findUnique({
    where: { businessId: tenant.id },
  });

  const initialSettings = buildTenantSettingsPayload(tenant, settings ?? null);

  return (
    <SettingsView tenantSlug={tenant.slug} initialSettings={initialSettings} />
  );
}
