import { type Prisma } from "@prisma/client";

import { type BusinessHour } from "@/lib/time";

export const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  { day: "Mon", enabled: true, open: "09:00", close: "18:00", breaks: [] },
  { day: "Tue", enabled: true, open: "09:00", close: "18:00", breaks: [] },
  { day: "Wed", enabled: true, open: "09:00", close: "18:00", breaks: [] },
  { day: "Thu", enabled: true, open: "09:00", close: "20:00", breaks: [{ start: "13:00", end: "13:30" }] },
  { day: "Fri", enabled: true, open: "09:00", close: "18:00", breaks: [] },
  { day: "Sat", enabled: false, open: "09:00", close: "14:00", breaks: [] },
  { day: "Sun", enabled: false, open: "09:00", close: "14:00", breaks: [] },
];

export function buildDefaultSettingsPayload(
  tenant: { id: string; name: string; slug: string },
): Prisma.SettingsUncheckedCreateInput {
  return {
    tenantId: tenant.id,
    businessName: tenant.name,
    email: `kontakt+${tenant.slug}@example.com`,
    phone: null,
    address: null,
    notes: null,
    businessHours: DEFAULT_BUSINESS_HOURS,
    holidays: [],
  };
}
