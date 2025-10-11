import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getTenantFromRequest, resolveBusiness } from "@/app/lib/tenant";

const ALLOWED_STATUSES = new Set(["pending", "accepted", "declined"]);

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const where: { businessId: string; date?: Date } = { businessId: biz.id };
  if (date) where.date = new Date(date);

  const data = await prisma.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const body = await req.json();
  const required = ["firstName", "lastName", "email", "date", "time"];
  if (required.some((k) => !body?.[k])) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const created = await prisma.booking.create({
    data: {
      businessId: biz.id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      date: new Date(body.date),
      time: body.time,
      status: "pending",
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const body = await req.json();
  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.businessId !== biz.id) {
    return NextResponse.json({ error: "booking not found" }, { status: 404 });
  }

  const nextStatus = typeof body.status === "string" ? body.status.toLowerCase() : "pending";
  const status = ALLOWED_STATUSES.has(nextStatus) ? nextStatus : "pending";

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}
