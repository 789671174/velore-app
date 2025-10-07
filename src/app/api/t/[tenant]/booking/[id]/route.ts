import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, BookingStatus } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req:NextRequest, { params }: { params: { tenant: string, id:string } }){
  const body = await req.json();
  const status = String(body?.status||"");
  if(!["accepted","declined","cancelled","pending"].includes(status)) return NextResponse.json({error:"invalid status"}, { status: 400 });
  const updated = await prisma.booking.update({ where: { id: params.id }, data: { status: status as BookingStatus } });
  return NextResponse.json(updated);
}