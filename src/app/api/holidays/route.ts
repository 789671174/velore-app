import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getTenantFromRequest, resolveBusiness } from "@/app/lib/tenant";

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const business = await resolveBusiness(tenant);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const holidays = await prisma.holiday.findMany({
    where: { businessId: business.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(req: Request) {
  const tenant = getTenantFromRequest(req);
  const business = await resolveBusiness(tenant);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const body = (await req.json()) as { date?: string; reason?: string };
  if (!body.date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const created = await prisma.holiday.create({
    data: {
      businessId: business.id,
      date: body.date,
      reason: body.reason?.trim() || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: Request) {
  const tenant = getTenantFromRequest(req);
  const business = await resolveBusiness(tenant);
  if (!business) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday || holiday.businessId !== business.id) {
    return NextResponse.json({ error: "holiday not found" }, { status: 404 });
  }

  await prisma.holiday.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
