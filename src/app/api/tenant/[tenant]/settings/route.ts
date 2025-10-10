import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { settingsSchema } from "@/lib/validators/settings";
import { ZodError } from "zod";

interface RouteContext {
  params: { tenant: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const tenant = await ensureTenantWithSettings(params.tenant);

  if (!tenant || !tenant.settings) {
    return NextResponse.json({ message: "Settings not found" }, { status: 404 });
  }

  return NextResponse.json(tenant.settings);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const data = await request.json();
    const payload = settingsSchema.parse(data);

    const tenant = await ensureTenantWithSettings(params.tenant);

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const updated = await prisma.settings.upsert({
      where: { tenantId: tenant.id },
      update: {
        businessName: payload.businessName,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        notes: payload.notes,
        businessHours: payload.businessHours,
        holidays: payload.holidays,
      },
      create: {
        tenantId: tenant.id,
        businessName: payload.businessName,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        notes: payload.notes,
        businessHours: payload.businessHours,
        holidays: payload.holidays,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
