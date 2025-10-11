import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  VacationRange,
  isDateWithinVacation,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
  sanitizeVacationRanges,
} from "@/app/lib/settings";
import { getTenantFromRequest, resolveBusiness } from "@/app/lib/tenant";

function buildSlots(
  dateStr: string,
  intervals: { from: string; to: string }[],
  slotMinutes: number,
  bufferMinutes: number,
) {
  const slots: string[] = [];

  for (const interval of intervals) {
    const start = new Date(`${dateStr}T${interval.from}:00`);
    const end = new Date(`${dateStr}T${interval.to}:00`);

    let cursor = start;
    while (cursor < end) {
      slots.push(cursor.toTimeString().slice(0, 5));
      cursor = new Date(cursor.getTime() + (slotMinutes + bufferMinutes) * 60_000);
    }
  }

  return slots;
}

function isVacationDay(vacations: VacationRange[], date: string) {
  return vacations.some((range) => isDateWithinVacation(date, range));
}

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const business = await resolveBusiness(tenant);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { businessId: business.id } });
  if (!settings) {
    return NextResponse.json({ slots: [] });
  }

  const workDays = normalizeWorkDays(safeParseJson(settings.workDaysJson, DEFAULT_WORK_DAYS));
  const hours = normalizeHours(safeParseJson(settings.hoursJson, DEFAULT_HOURS));
  const vacationDays = sanitizeVacationRanges(safeParseJson(settings.vacationDaysJson, [] as VacationRange[]));

  const currentDate = new Date(`${dateStr}T00:00:00`);
  const weekday = currentDate.getDay();

  if (workDays.length && !workDays.includes(weekday)) {
    return NextResponse.json({ slots: [] });
  }

  if (isVacationDay(vacationDays, dateStr)) {
    return NextResponse.json({ slots: [] });
  }

  const holidays = await prisma.holiday.findMany({
    where: { businessId: business.id, date: dateStr },
  });

  if (holidays.length > 0) {
    return NextResponse.json({ slots: [] });
  }

  const intervals = hours[weekday] ?? [];
  if (!intervals.length) {
    return NextResponse.json({ slots: [] });
  }

  const slotMinutes = settings.slotMinutes || 30;
  const bufferMinutes = settings.bufferMinutes || 0;

  const slots = buildSlots(dateStr, intervals, slotMinutes, bufferMinutes);

  return NextResponse.json({ slots });
}
