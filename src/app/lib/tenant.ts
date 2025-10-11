import "server-only";

import type { Business, Settings } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
  sanitizeVacationRanges,
  type TimeRange,
  type VacationRange,
} from "@/app/lib/settings";

export type TenantSettingsPayload = {
  tenant: string;
  name: string;
  email: string | null;
  logoDataUrl: string | null;
  slotMinutes: number;
  bufferMinutes: number;
  workDays: number[];
  hours: Record<number, TimeRange[]>;
  vacationDays: VacationRange[];
  bookingNotes: string | null;
  timezone: string;
};

export function normalizeTenantSlug(value?: string | null) {
  return (value ?? "").toString().trim().toLowerCase();
}

export function getTenantFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const tenantParam = normalizeTenantSlug(url.searchParams.get("tenant"));
    if (tenantParam) return tenantParam;
    const legacyParam = normalizeTenantSlug(url.searchParams.get("t"));
    if (legacyParam) return legacyParam;
  } catch (error) {
    // ignore invalid URL errors and fall back to headers / env
  }

  const headerSlug = normalizeTenantSlug(req.headers.get("x-tenant"));
  if (headerSlug) return headerSlug;

  const envSlug = normalizeTenantSlug(process.env.DEFAULT_TENANT);
  return envSlug || null;
}

export async function resolveBusiness(tenant?: string | null) {
  const explicit = normalizeTenantSlug(tenant);
  const fallback = normalizeTenantSlug(process.env.DEFAULT_TENANT);
  const slug = explicit || fallback;
  if (!slug) return null;
  return prisma.business.findUnique({ where: { slug } });
}

type TenantSearchParams = {
  t?: string | string[];
  tenant?: string | string[];
};

function pickSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value.find((entry) => normalizeTenantSlug(entry)) ?? "";
  }
  return value ?? "";
}

export function getTenantSlug(searchParams?: TenantSearchParams) {
  const candidate = normalizeTenantSlug(pickSearchParam(searchParams?.tenant));
  const legacy = normalizeTenantSlug(pickSearchParam(searchParams?.t));
  const fallback = normalizeTenantSlug(process.env.DEFAULT_TENANT);
  const slug = candidate || legacy || fallback;
  if (!slug) {
    throw new Error("Kein Tenant-Slug gefunden. Setze DEFAULT_TENANT oder übergebe ?tenant=slug.");
  }
  return slug;
}

export function buildTenantSettingsPayload(
  business: Business,
  settings: Settings | null,
): TenantSettingsPayload {
  const workDaysRaw = safeParseJson(settings?.workDaysJson ?? null, DEFAULT_WORK_DAYS);
  const hoursRaw = safeParseJson(settings?.hoursJson ?? null, DEFAULT_HOURS);
  const vacationRaw = safeParseJson(settings?.vacationDaysJson ?? null, [] as VacationRange[]);

  const workDays = normalizeWorkDays(workDaysRaw);
  const hours = normalizeHours(hoursRaw);

  return {
    tenant: business.slug,
    name: business.name,
    email: business.email ?? null,
    logoDataUrl: business.logoDataUrl ?? null,
    slotMinutes: settings?.slotMinutes ?? 30,
    bufferMinutes: settings?.bufferMinutes ?? 0,
    workDays: workDays.length ? workDays : DEFAULT_WORK_DAYS,
    hours: Object.keys(hours).length ? hours : DEFAULT_HOURS,
    vacationDays: sanitizeVacationRanges(vacationRaw),
    bookingNotes: settings?.bookingNotes ?? null,
    timezone: business.timezone || "Europe/Zurich",
  };
}

export async function getSettingsByTenantSlug(slug: string) {
  const normalized = normalizeTenantSlug(slug);
  if (!normalized) return null;

  const business = await prisma.business.findUnique({ where: { slug: normalized } });
  if (!business) return null;

  const settings = await prisma.settings.findUnique({ where: { businessId: business.id } });
  return buildTenantSettingsPayload(business, settings);
}
