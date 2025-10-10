import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: { tenant: string; id: string };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const data = await request.json();
    const status = data.status as "confirmed" | "cancelled";

    if (!status || !["confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ message: "Status ungültig" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
    });

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const booking = await prisma.booking.updateMany({
      where: { id: params.id, tenantId: tenant.id },
      data: { status },
    });

    if (booking.count === 0) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    const updated = await prisma.booking.findUnique({ where: { id: params.id } });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
