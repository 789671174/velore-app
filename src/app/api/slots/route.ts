import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getTenantFromRequest, resolveBusiness } from "@/app/lib/tenant";

export async function GET(req: Request) {
  const tenant = getTenantFromRequest(req);
  const biz = await resolveBusiness(tenant);
  if (!biz) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 });

  const settings = await prisma.settings.findUnique({ where: { businessId: biz.id } });
  if (!settings) return NextResponse.json({ slots: [] });

  const holidays = await prisma.holiday.findMany({ where: { businessId: biz.id, date: dateStr }});
  if (holidays.length) return NextResponse.json({ slots: [] });

  const hours = JSON.parse(settings.hoursJson || "{}");
  const weekday = new Date(dateStr + "T00:00:00").getDay(); // 0..6
  const def = hours?.[weekday]?.open;
  if (!def || def.length === 0) return NextResponse.json({ slots: [] });

  const slots: string[] = [];
  const slotMinutes = settings.slotMinutes || 30;
  const pad = settings.bufferMinutes || 0;

  for (const [from, to] of def as [string, string][]) {
    let cur = new Date(`${dateStr}T${from}:00`);
    const end = new Date(`${dateStr}T${to}:00`);
    while (cur < end) {
      slots.push(cur.toTimeString().slice(0,5));
      cur = new Date(cur.getTime() + (slotMinutes + pad) * 60000);
    }
  }
  return NextResponse.json({ slots });
}
