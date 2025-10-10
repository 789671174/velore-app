import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureTenantWithSettings } from "@/lib/tenant";
import { settingsSchema } from "@/lib/validators/settings";

function getTenantSlug(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("tenant");
}

export async function GET(request: Request) {
  const tenantSlug = getTenantSlug(request);

  if (!tenantSlug) {
    return NextResponse.json({ message: "Tenant erforderlich" }, { status: 400 });
  }

  const tenant = await ensureTenantWithSettings(tenantSlug);

  if (!tenant || !tenant.settings) {
    return NextResponse.json({ message: "Tenant nicht gefunden" }, { status: 404 });
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

  return NextResponse.json(parsed);
}

export async function PATCH(request: Request) {
  try {
    const tenantSlug = getTenantSlug(request);

    if (!tenantSlug) {
      return NextResponse.json({ message: "Tenant erforderlich" }, { status: 400 });
    }

    const tenant = await ensureTenantWithSettings(tenantSlug);

    if (!tenant || !tenant.settings) {
      return NextResponse.json({ message: "Tenant nicht gefunden" }, { status: 404 });
    }

    const data = await request.json();
    const payload = settingsSchema.parse(data);

    const sanitized = {
      businessName: payload.businessName.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() ? payload.phone.trim() : null,
      address: payload.address?.trim() ? payload.address.trim() : null,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
      businessHours: payload.businessHours,
      holidays: payload.holidays,
    } as const;

    const updated = await prisma.settings.update({
      where: { tenantId: tenant.id },
      data: {
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

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ message: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
