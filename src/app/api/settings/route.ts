import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  VacationRange,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
  sanitizeVacationRanges,
} from "@/app/lib/settings";
import {
  ensureBusiness,
  ensureBusinessWithSettings,
  getTenantFromRequest,
  normalizeTenantSlug,
} from "@/app/lib/tenant";

type SettingsPayload = {
  tenant?: string;
  name?: string;
  email?: string;
  logoDataUrl?: string | null;
  slotMinutes?: number;
  bufferMinutes?: number;
  workDays?: number[];
  hours?: Record<number, { from: string; to: string }[]>;
  vacationDays?: VacationRange[];
  bookingNotes?: string | null;
};

function prepareHours(value: SettingsPayload["hours"]) {
  if (!value || typeof value !== "object") {
    return DEFAULT_HOURS;
  }

  const normalized = normalizeHours(value);
  return Object.keys(normalized).length ? normalized : DEFAULT_HOURS;
}

function prepareWorkDays(value: SettingsPayload["workDays"]) {
  const normalized = normalizeWorkDays(value ?? []);
  return normalized.length ? normalized : DEFAULT_WORK_DAYS;
}

async function getTenantContext(req: Request) {
  const slug = getTenantFromRequest(req);
  return ensureBusinessWithSettings(slug);
}

export async function GET(req: Request) {
  const context = await getTenantContext(req);
  const { business, settings } = context;

  const workDays = safeParseJson(settings.workDaysJson, DEFAULT_WORK_DAYS);
  const hours = safeParseJson(settings.hoursJson, DEFAULT_HOURS);
  const vacations = sanitizeVacationRanges(safeParseJson(settings.vacationDaysJson, [] as VacationRange[]));

  return NextResponse.json({
    tenant: business.slug,
    name: business.name,
    email: business.email,
    logoDataUrl: business.logoDataUrl,
    slotMinutes: settings.slotMinutes,
    bufferMinutes: settings.bufferMinutes,
    workDays: normalizeWorkDays(workDays),
    hours: normalizeHours(hours),
    vacationDays: vacations,
    bookingNotes: settings.bookingNotes,
    timezone: business.timezone,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as SettingsPayload;
  const tenant = normalizeTenantSlug(body.tenant || getTenantFromRequest(req));
  const business = await ensureBusiness(tenant);

  const workDays = prepareWorkDays(body.workDays);
  const hours = prepareHours(body.hours);
  const vacationDays = sanitizeVacationRanges(body.vacationDays);

  const slotMinutes = Math.max(5, Math.min(240, Number(body.slotMinutes ?? 30)));
  const bufferMinutes = Math.max(0, Math.min(120, Number(body.bufferMinutes ?? 0)));

  const logoDataUrl = body.logoDataUrl?.trim() || null;
  const bookingNotes = body.bookingNotes?.toString().trim() || null;
  const name = body.name?.toString().trim() || business.name;
  const email = body.email?.toString().trim() || null;

  const updatedBusiness = await prisma.business.update({
    where: { id: business.id },
    data: {
      name,
      email,
      logoDataUrl,
    },
  });

  const settings = await prisma.settings.upsert({
    where: { businessId: business.id },
    update: {
      slotMinutes,
      bufferMinutes,
      hoursJson: JSON.stringify(hours),
      workDaysJson: JSON.stringify(workDays),
      vacationDaysJson: JSON.stringify(vacationDays),
      bookingNotes,
    },
    create: {
      businessId: business.id,
      slotMinutes,
      bufferMinutes,
      hoursJson: JSON.stringify(hours),
      workDaysJson: JSON.stringify(workDays),
      vacationDaysJson: JSON.stringify(vacationDays),
      bookingNotes,
    },
  });

  return NextResponse.json({
    ok: true,
    business: updatedBusiness,
    settings,
  });
}
