import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getTenantFromRequest, resolveBusiness } from "@/app/lib/tenant";

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  const settings = await prisma.settings.findUnique({ where: { businessId: biz.id } });
  return NextResponse.json(settings || {});
}

export async function POST(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const body = await req.json();
  const payload = {
    slotMinutes: Number(body.slotMinutes ?? 30),
    bufferMinutes: Number(body.bufferMinutes ?? 0),
    hoursJson: typeof body.hoursJson === "string" ? body.hoursJson : JSON.stringify(body.hoursJson || {}),
  };

  const upserted = await prisma.settings.upsert({
    where: { businessId: biz.id },
    update: payload,
    create: { businessId: biz.id, ...payload },
  });
  return NextResponse.json(upserted);
}
