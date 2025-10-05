import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenant, slotMinutes, bufferMinutes } = body as {
      tenant: string;
      slotMinutes: number;
      bufferMinutes: number;
    };

    if (!tenant) return NextResponse.json({ error: "tenant required" }, { status: 400 });

    const business = await prisma.business.findUnique({ where: { slug: tenant } });
    if (!business) return NextResponse.json({ error: "business not found" }, { status: 404 });

    const updated = await prisma.settings.upsert({
      where: { businessId: business.id },
      update: { slotMinutes, bufferMinutes },
      create: { businessId: business.id, slotMinutes, bufferMinutes, hoursJson: "{}" },
    });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "unknown error" }, { status: 500 });
  }
}
