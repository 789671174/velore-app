import { parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { buildTimeSlots } from "@/lib/time";
import { bookingSchema } from "@/lib/validators/booking";
import { availabilitySchema } from "@/lib/validators/settings";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const payload = bookingSchema.parse(data);

    const tenant = await ensureTenantWithSettings(payload.tenant);

    if (!tenant || !tenant.settings) {
      return NextResponse.json({ message: "Tenant nicht gefunden" }, { status: 404 });
    }

    const availability = availabilitySchema.parse({
      businessHours: tenant.settings.businessHours,
      holidays: tenant.settings.holidays,
    });

    const bookingDate = parseISO(payload.date);

    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json({ message: "Ungültiges Datum" }, { status: 400 });
    }

    const slots = buildTimeSlots(bookingDate, availability.businessHours, availability.holidays);

    const slotExists = slots.some((slot) => {
      const start = `${slot.start.getHours().toString().padStart(2, "0")}:${slot.start
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const end = `${slot.end.getHours().toString().padStart(2, "0")}:${slot.end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      return start === payload.startTime && end === payload.endTime;
    });

    if (!slotExists) {
      return NextResponse.json({ message: "Zeitslot ist nicht verfügbar" }, { status: 400 });
    }

    const firstName = payload.firstName.trim();
    const lastName = payload.lastName.trim();
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone?.trim() ? payload.phone.trim() : null;
    const notes = payload.notes?.trim() ? payload.notes.trim() : null;

    const overlap = await prisma.booking.findFirst({
      where: {
        tenantId: tenant.id,
        date: payload.date,
        status: { in: ["pending", "confirmed"] },
        NOT: [
          {
            OR: [
              {
                endTime: {
                  lte: payload.startTime,
                },
              },
              {
                startTime: {
                  gte: payload.endTime,
                },
              },
            ],
          },
        ],
      },
    });

    if (overlap) {
      return NextResponse.json({ message: "Zeitslot bereits gebucht" }, { status: 409 });
    }

    const customer = await prisma.customer.upsert({
      where: {
        email_tenantId: {
          email,
          tenantId: tenant.id,
        },
      },
      update: {
        firstName,
        lastName,
        phone,
      },
      create: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        notes,
        status: "pending",
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Ungültige Buchung" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Ungültige Buchung" }, { status: 400 });
  }
}
