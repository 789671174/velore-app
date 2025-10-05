import "server-only";
import { prisma } from "@/app/lib/prisma";

export function getTenantSlug(searchParams?: { t?: string | string[] }) {
  const tParam = Array.isArray(searchParams?.t) ? searchParams?.t[0] : searchParams?.t;
  const slug = (tParam ?? process.env.DEFAULT_TENANT ?? "").trim();
  if (!slug) throw new Error("Kein Tenant-Slug gefunden. Setze DEFAULT_TENANT oder übergebe ?t=slug.");
  return slug;
}

export async function ensureBusinessWithSettings(slug: string) {
  let business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    business = await prisma.business.create({
      data: { slug, name: slug.replace(/-/g, " ") },
    });
  }

  let settings = await prisma.settings.findUnique({ where: { businessId: business.id } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        businessId: business.id,
        slotMinutes: 30,
        bufferMinutes: 0,
        hoursJson: "{}",
      },
    });
  }

  return { business, settings };
}
