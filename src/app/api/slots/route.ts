import { parseISO } from "date-fns";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { buildTimeSlots } from "@/lib/time";
import { availabilitySchema } from "@/lib/validators/settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant");
  const dateParam = searchParams.get("date");

  if (!tenantSlug || !dateParam) {
    return NextResponse.json({ message: "Tenant und Datum erforderlich" }, { status: 400 });
  }

  const tenant = await ensureTenantWithSettings(tenantSlug);

  if (!tenant || !tenant.settings) {
    return NextResponse.json({ message: "Tenant nicht gefunden" }, { status: 404 });
  }

  const availability = availabilitySchema.parse({
    businessHours: tenant.settings.businessHours,
    holidays: tenant.settings.holidays,
  });

  const date = parseISO(dateParam);

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Ungültiges Datum" }, { status: 400 });
  }

  const slots = buildTimeSlots(date, availability.businessHours, availability.holidays);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: tenant.id,
      date: dateParam,
      status: { in: ["pending", "confirmed"] },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const filtered = slots.filter((slot) => {
    const start = `${slot.start.getHours().toString().padStart(2, "0")}:${slot.start
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const end = `${slot.end.getHours().toString().padStart(2, "0")}:${slot.end
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    return !bookings.some((booking) => booking.startTime === start && booking.endTime === end);
  });

  return NextResponse.json(
    filtered.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: slot.label,
    })),
  );
}
