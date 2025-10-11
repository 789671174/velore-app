// Server component: fetch tenant + settings on the server,
// pass safe defaults to the existing client SettingsView.

import SettingsView from "./SettingsView"; // this is a CLIENT component
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

type Params = { params: { tenant: string } };

type Break = { start: string; end: string };
type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type Hours = { day: Day; open: string; close: string; breaks?: Break[] };

const defaultBusinessHours: Hours[] = [
  { day: "Mon", open: "09:00", close: "18:00" },
  { day: "Tue", open: "09:00", close: "18:00" },
  { day: "Wed", open: "09:00", close: "18:00" },
  { day: "Thu", open: "09:00", close: "18:00" },
  { day: "Fri", open: "09:00", close: "18:00" },
  { day: "Sat", open: "10:00", close: "16:00" },
  { day: "Sun", open: "00:00", close: "00:00" }, // closed if equal
];

export default async function SettingsPage({ params }: Params) {
  const slug = params.tenant;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!tenant) notFound();

  // Try to load settings; if none exist, pass safe defaults (do not create here)
  const settings = await prisma.settings.findUnique({
    where: { tenantId: tenant.id },
    select: { business_hours: true, holidays: true },
  });

  const initialSettings = {
    business_hours: settings?.business_hours ?? defaultBusinessHours,
    holidays: settings?.holidays ?? [],
  };

  return (
    <SettingsView
      tenantSlug={tenant.slug}
      initialSettings={initialSettings}
    />
  );
}
