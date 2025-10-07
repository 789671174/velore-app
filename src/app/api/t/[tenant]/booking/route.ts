import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req:NextRequest, { params }: { params: { tenant: string } }){
  const biz = await prisma.business.findUnique({ where: { slug: params.tenant } });
  if(!biz) return NextResponse.json([]);
  const items = await prisma.booking.findMany({
    where: { businessId: biz.id },
    orderBy: { start: "asc" }
  });
  return NextResponse.json(items);
}

export async function POST(req:NextRequest, { params }: { params: { tenant: string } }){
  const body = await req.json();
  const biz = await prisma.business.upsert({
    where: { slug: params.tenant },
    update: {},
    create: { slug: params.tenant }
  });
  const settings = await prisma.businessSettings.findFirst({ where: { businessId: biz.id } });
  const slotM = settings?.slotMinutes ?? 30;

  // body: { firstName, lastName, email, phone, date: YYYY-MM-DD, time: HH:MM }
  const start = new Date(`${body.date}T${body.time}:00.000Z`);
  const end   = new Date(start.getTime() + slotM*60000);

  const created = await prisma.booking.create({
    data: {
      businessId: biz.id,
      firstName: String(body.firstName||"").trim(),
      lastName:  String(body.lastName||"").trim(),
      email:     String(body.email||"").trim(),
      phone:     body.phone ? String(body.phone).trim() : null,
      start, end
    }
  });
  return NextResponse.json(created, { status: 201 });
}