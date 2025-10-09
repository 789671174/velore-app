import "server-only";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "velora-hairstyles";

export type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  start: string;
  end: string;
  status: "pending" | "accepted" | "declined";
};

export type TenantSettings = {
  companyName: string;
  email: string;
  workingDays: string[];
  openFrom: string;
  openTo: string;
  slotMinutes: number;
  bufferMinutes: number;
};

export type Holiday = {
  id: string;
  date: string;
  reason?: string | null;
};

type TenantData = {
  slug: string;
  settings: TenantSettings;
  bookings: Booking[];
  holidays: Holiday[];
};

const DEFAULT_SETTINGS: TenantSettings = {
  companyName: "Velora Studio",
  email: "studio@example.com",
  workingDays: ["mo", "di", "mi", "do", "fr"],
  openFrom: "09:00",
  openTo: "18:00",
  slotMinutes: 30,
  bufferMinutes: 0,
};

const memoryStore: Map<string, TenantData> =
  (globalThis as any).__veloreStore ?? new Map();
if (!(globalThis as any).__veloreStore) {
  (globalThis as any).__veloreStore = memoryStore;
}

function kvAvailable() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function tenantKey(slug: string) {
  return `velore:tenant:${slug}`;
}

async function readTenant(slug: string): Promise<TenantData | null> {
  if (kvAvailable()) {
    const data = await kv.get<TenantData>(tenantKey(slug));
    return data ?? null;
  }
  return memoryStore.get(slug) ?? null;
}

async function writeTenant(slug: string, data: TenantData) {
  if (kvAvailable()) {
    await kv.set(tenantKey(slug), data);
  } else {
    memoryStore.set(slug, data);
  }
}

export async function ensureTenant(slug?: string) {
  const tenantSlug = (slug ?? DEFAULT_TENANT).trim();
  const existing = await readTenant(tenantSlug);
  if (existing) return existing;

  const created: TenantData = {
    slug: tenantSlug,
    settings: { ...DEFAULT_SETTINGS },
    bookings: [],
    holidays: [],
  };

  await writeTenant(tenantSlug, created);
  return created;
}

export async function getTenant(slug: string) {
  return ensureTenant(slug);
}

export async function updateSettings(slug: string, settings: Partial<TenantSettings>) {
  const tenant = await ensureTenant(slug);
  const merged: TenantSettings = {
    ...tenant.settings,
    ...settings,
    workingDays: settings.workingDays ?? tenant.settings.workingDays,
  };

  const updated: TenantData = { ...tenant, settings: merged };
  await writeTenant(slug, updated);
  return merged;
}

export async function listBookings(slug: string) {
  const tenant = await ensureTenant(slug);
  return tenant.bookings.sort((a, b) => a.start.localeCompare(b.start));
}

export async function createBooking(slug: string, booking: Omit<Booking, "id" | "status">) {
  const tenant = await ensureTenant(slug);
  const id = randomUUID();
  const record: Booking = { ...booking, id, status: "pending" };

  const exists = tenant.bookings.some((b) => b.start === booking.start);
  if (exists) {
    throw new Error("Dieser Zeitraum ist bereits reserviert.");
  }

  const updated: TenantData = {
    ...tenant,
    bookings: [...tenant.bookings, record],
  };
  await writeTenant(slug, updated);
  return record;
}

export async function updateBookingStatus(slug: string, id: string, status: Booking["status"]) {
  const tenant = await ensureTenant(slug);
  const bookings = tenant.bookings.map((b) =>
    b.id === id
      ? {
          ...b,
          status,
        }
      : b
  );
  const exists = bookings.some((b) => b.id === id);
  if (!exists) throw new Error("Buchung nicht gefunden.");
  await writeTenant(slug, { ...tenant, bookings });
  return bookings.find((b) => b.id === id)!;
}

export async function listHolidays(slug: string) {
  const tenant = await ensureTenant(slug);
  return tenant.holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export async function addHoliday(slug: string, holiday: Omit<Holiday, "id">) {
  const tenant = await ensureTenant(slug);
  const id = randomUUID();
  const record: Holiday = { ...holiday, id };
  const updated: TenantData = {
    ...tenant,
    holidays: [...tenant.holidays, record],
  };
  await writeTenant(slug, updated);
  return record;
}

export async function removeHoliday(slug: string, id: string) {
  const tenant = await ensureTenant(slug);
  const exists = tenant.holidays.some((h) => h.id === id);
  if (!exists) throw new Error("Feiertag nicht gefunden.");
  const updated: TenantData = {
    ...tenant,
    holidays: tenant.holidays.filter((h) => h.id !== id),
  };
  await writeTenant(slug, updated);
}

export function getDefaultTenant() {
  return DEFAULT_TENANT;
}
