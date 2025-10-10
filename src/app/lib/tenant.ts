import "server-only";

import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
} from "@/app/lib/settings";

const FALLBACK_TENANT = "default";

function normalizeSlug(raw: string | null | undefined) {
  return (raw ?? "").trim().toLowerCase();
}

export function getTenantFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const querySlug = normalizeSlug(url.searchParams.get("t"));
    if (querySlug) return querySlug;
  } catch (error) {
    // Invalid URLs should not crash tenant resolution – fall through to headers/env.
  }

  const headerSlug = normalizeSlug(req.headers.get("x-tenant"));
  if (headerSlug) return headerSlug;

  const envSlug = normalizeSlug(process.env.DEFAULT_TENANT);
  if (envSlug) return envSlug;

  return null;
}

export async function resolveBusiness(tenant?: string | null) {
  const slug = normalizeSlug(tenant ?? process.env.DEFAULT_TENANT ?? FALLBACK_TENANT);
  if (!slug) return null;
  return prisma.business.findUnique({ where: { slug } });
}

export function getTenantSlug(searchParams?: { t?: string | string[] }) {
  const tParam = Array.isArray(searchParams?.t) ? searchParams?.t[0] : searchParams?.t;
  const querySlug = normalizeSlug(tParam);
  if (querySlug) return querySlug;

  const envSlug = normalizeSlug(process.env.DEFAULT_TENANT);
  if (envSlug) return envSlug;

  return FALLBACK_TENANT;
}

export async function ensureBusinessWithSettings(slug: string) {
  const normalizedSlug = normalizeSlug(slug) || FALLBACK_TENANT;

  let business = await prisma.business.findUnique({ where: { slug: normalizedSlug } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        slug: normalizedSlug,
        name: normalizedSlug.replace(/-/g, " "),
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
