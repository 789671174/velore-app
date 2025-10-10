import "server-only";
import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  safeParseJson,
  normalizeHours,
  normalizeWorkDays,
} from "@/app/lib/settings";

export function getTenantFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("t");
    if (slug) return slug;
  } catch (error) {
    // ignore invalid URL errors and fall back to headers / env
  }
  const headerSlug = (req.headers.get("x-tenant") || "").trim();
  if (headerSlug) return headerSlug;
  const envSlug = (process.env.DEFAULT_TENANT || "").trim();
  return envSlug || null;
}

export async function resolveBusiness(tenant?: string | null) {
  const slug = (tenant || process.env.DEFAULT_TENANT || "").toLowerCase().trim();
  if (!slug) return null;
  return prisma.business.findUnique({ where: { slug } });
}

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
      data: {
        slug,
        name: slug.replace(/-/g, " "),
        email: null,
        logoDataUrl: null,
        timezone: "Europe/Zurich",
      },
    });
  }

  let settings = await prisma.settings.findUnique({ where: { businessId: business.id } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        businessId: business.id,
        slotMinutes: 30,
        bufferMinutes: 0,
        hoursJson: JSON.stringify(DEFAULT_HOURS),
        workDaysJson: JSON.stringify(DEFAULT_WORK_DAYS),
        vacationDaysJson: JSON.stringify([]),
        bookingNotes: null,
      },
    });
  }

  // Ensure settings JSON blobs are normalized so the entrepreneur UI always receives valid data
  const workDays = normalizeWorkDays(safeParseJson(settings.workDaysJson, DEFAULT_WORK_DAYS));
  const hours = normalizeHours(safeParseJson(settings.hoursJson, DEFAULT_HOURS));
  const normalizedSettings = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      workDaysJson: JSON.stringify(workDays.length ? workDays : DEFAULT_WORK_DAYS),
      hoursJson: JSON.stringify(Object.keys(hours).length ? hours : DEFAULT_HOURS),
    },
  });

  return { business, settings: normalizedSettings };
}
