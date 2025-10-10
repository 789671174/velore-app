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

  const parsed = settingsSchema.parse({
    businessName: tenant.settings.businessName,
    email: tenant.settings.email,
    phone: tenant.settings.phone,
    address: tenant.settings.address,
    notes: tenant.settings.notes,
    businessHours: tenant.settings.businessHours,
    holidays: tenant.settings.holidays,
  });

  return NextResponse.json({
    ...parsed,
    id: tenant.settings.id,
    tenantId: tenant.settings.tenantId,
    updatedAt: tenant.settings.updatedAt.toISOString(),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const data = await request.json();
    const payload = settingsSchema.parse(data);

    const tenant = await ensureTenantWithSettings(params.tenant);

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const sanitized = {
      businessName: payload.businessName.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() ? payload.phone.trim() : null,
      address: payload.address?.trim() ? payload.address.trim() : null,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
      businessHours: payload.businessHours,
      holidays: payload.holidays,
    };

    const updated = await prisma.settings.upsert({
      where: { tenantId: tenant.id },
      update: {
        ...sanitized,
      },
      create: {
        tenantId: tenant.id,
        ...sanitized,
      },
    });

    const parsed = settingsSchema.parse({
      businessName: updated.businessName,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      notes: updated.notes,
      businessHours: updated.businessHours,
      holidays: updated.holidays,
    });

    return NextResponse.json({
      ...parsed,
      id: updated.id,
      tenantId: updated.tenantId,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
