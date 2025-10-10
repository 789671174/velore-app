import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
  sanitizeVacationRanges,
} from "@/app/lib/settings";
import { ensureBusinessWithSettings, getTenantSlug } from "@/app/lib/tenant";
import type { Holiday, TimeRange, VacationRange } from "@/app/types";
import SettingsView from "./SettingsView";

function toClientHours(json: string | null): Record<number, TimeRange[]> {
  const parsed = safeParseJson(json, DEFAULT_HOURS);
  const normalized = normalizeHours(parsed);
  return Object.keys(normalized).length ? normalized : DEFAULT_HOURS;
}

function toClientWorkDays(json: string | null): number[] {
  const parsed = safeParseJson(json, DEFAULT_WORK_DAYS);
  const normalized = normalizeWorkDays(parsed);
  return normalized.length ? normalized : DEFAULT_WORK_DAYS;
}

function toClientVacations(json: string | null): VacationRange[] {
  return sanitizeVacationRanges(safeParseJson(json, [] as VacationRange[]));
}

export default async function EntrepreneurSettingsPage({
  searchParams,
}: {
  searchParams?: { t?: string };
}) {
  const slug = getTenantSlug(searchParams);
  const { business, settings } = await ensureBusinessWithSettings(slug);

  const holidays = await prisma.holiday.findMany({
    where: { businessId: business.id },
    orderBy: { date: "asc" },
  });

  const safeBusiness = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    email: business.email ?? "",
    logoDataUrl: business.logoDataUrl ?? "",
  };

  const safeSettings = {
    slotMinutes: settings.slotMinutes,
    bufferMinutes: settings.bufferMinutes,
    bookingNotes: settings.bookingNotes ?? "",
    workDays: toClientWorkDays(settings.workDaysJson),
    hours: toClientHours(settings.hoursJson),
    vacations: toClientVacations(settings.vacationDaysJson),
  };

  const safeHolidays: Holiday[] = holidays.map((holiday) => ({
    id: holiday.id,
    date: holiday.date,
    reason: holiday.reason ?? null,
  }));

  return (
    <SettingsView
      tenant={safeBusiness.slug}
      business={safeBusiness}
      initialSettings={safeSettings}
      initialHolidays={safeHolidays}
    />
  );
}
