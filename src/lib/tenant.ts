import { prisma } from "@/lib/prisma";
import { buildDefaultSettingsPayload } from "@/lib/defaults";

export async function ensureTenantWithSettings(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true },
  });

  if (!tenant) {
    return null;
  }

  if (tenant.settings) {
    return tenant;
  }

  const settings = await prisma.settings.create({
    data: buildDefaultSettingsPayload(tenant),
  });

  return { ...tenant, settings };
}
