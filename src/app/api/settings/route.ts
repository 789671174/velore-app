import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  normalizeHours,
  normalizeWorkDays,
  sanitizeVacationRanges,
} from "@/app/lib/settings";
import {
  buildTenantSettingsPayload,
  getSettingsByTenantSlug,
  getTenantFromRequest,
  normalizeTenantSlug,
} from "@/app/lib/tenant";

const timeRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const vacationSchema = z.object({
  start: z.string().min(1),
  end: z.string().optional(),
  note: z.string().optional(),
});

const settingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
  logoDataUrl: z.string().max(500_000).optional().nullable(),
  slotMinutes: z.number().int().min(5).max(240).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
  hours: z.record(z.array(timeRangeSchema)).optional(),
  vacationDays: z.array(vacationSchema).optional(),
  bookingNotes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: Request) {
  const tenantSlug = getTenantFromRequest(req);
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenant missing" }, { status: 400 });
  }

  const settings = await getSettingsByTenantSlug(tenantSlug);
  if (!settings) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const tenantSlug = normalizeTenantSlug(getTenantFromRequest(req));
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenant missing" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { slug: tenantSlug } });
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const name = data.name?.trim() || business.name;
  const email = data.email?.trim() || null;
  const logoDataUrl = data.logoDataUrl?.toString().trim() || null;
  const slotMinutes = Math.max(5, Math.min(240, data.slotMinutes ?? 30));
  const bufferMinutes = Math.max(0, Math.min(120, data.bufferMinutes ?? 0));
  const workDays = normalizeWorkDays(data.workDays ?? DEFAULT_WORK_DAYS);
  const hours = normalizeHours(data.hours ?? DEFAULT_HOURS);
  const vacationDays = sanitizeVacationRanges(data.vacationDays ?? []);
  const bookingNotes = data.bookingNotes?.toString().trim() || null;

  const [updatedBusiness, updatedSettings] = await prisma.$transaction([
    prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        email,
        logoDataUrl,
      },
    }),
    prisma.settings.upsert({
      where: { businessId: business.id },
      update: {
        slotMinutes,
        bufferMinutes,
        hoursJson: JSON.stringify(Object.keys(hours).length ? hours : DEFAULT_HOURS),
        workDaysJson: JSON.stringify(workDays.length ? workDays : DEFAULT_WORK_DAYS),
        vacationDaysJson: JSON.stringify(vacationDays),
        bookingNotes,
      },
      create: {
        businessId: business.id,
        slotMinutes,
        bufferMinutes,
        hoursJson: JSON.stringify(Object.keys(hours).length ? hours : DEFAULT_HOURS),
        workDaysJson: JSON.stringify(workDays.length ? workDays : DEFAULT_WORK_DAYS),
        vacationDaysJson: JSON.stringify(vacationDays),
        bookingNotes,
      },
    }),
  ]);

  const payload = buildTenantSettingsPayload(updatedBusiness, updatedSettings);
  return NextResponse.json({ ok: true, settings: payload });
}

export async function POST(req: Request) {
  return PATCH(req);
}
