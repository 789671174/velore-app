import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { ensureBusiness, getTenantFromRequest } from "@/app/lib/tenant";

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await ensureBusiness(tenant);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // optionaler Filter
  const where: any = { businessId: biz.id };
  if (date) where.date = new Date(date);

  const data = await prisma.booking.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await ensureBusiness(tenant);

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
  const biz = await ensureBusiness(tenant);

  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await prisma.booking.update({
    where: { id: body.id },
    data: { status: body.status ?? "pending" },
  });
  return NextResponse.json(updated);
}
