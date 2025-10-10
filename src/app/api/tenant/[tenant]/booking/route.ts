import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { buildTimeSlots } from "@/lib/time";
import { bookingSchema } from "@/lib/validators/booking";
import { ZodError } from "zod";

interface RouteContext {
  params: { tenant: string };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const data = await request.json();
    const payload = bookingSchema.parse({ ...data, tenant: params.tenant });

    const tenant = await ensureTenantWithSettings(params.tenant);

    if (!tenant || !tenant.settings) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const bookingDate = new Date(payload.date);
    const slots = buildTimeSlots(
      bookingDate,
      tenant.settings.businessHours as any,
      (tenant.settings.holidays as string[]) ?? [],
    );

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
          email: payload.email,
          tenantId: tenant.id,
        },
      },
      update: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
      },
      create: {
        tenantId: tenant.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        notes: payload.notes,
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
