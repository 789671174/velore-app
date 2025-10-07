import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, BookingStatus } from "@prisma/client";
const prisma = new PrismaClient();

type DayKey = "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun";
const dayKeys: DayKey[] = ["sun","mon","tue","wed","thu","fri","sat"];

function toMinutes(hhmm:string){ const [h,m]=hhmm.split(":").map(Number); return h*60+m; }
function addMinutes(date:Date, m:number){ return new Date(date.getTime()+m*60000); }

export async function GET(req:NextRequest, { params }: { params: { tenant: string } }){
  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date"); // YYYY-MM-DD
  if(!dateStr) return NextResponse.json([], { status: 200 });

  // Business + Settings
  let biz = await prisma.business.findUnique({ where: { slug: params.tenant } });
  if(!biz) return NextResponse.json([], { status: 200 });
  const s = await prisma.businessSettings.findFirst({ where: { businessId: biz.id } });
  if(!s) return NextResponse.json([], { status: 200 });

  const hours = JSON.parse(s.hoursJson||"{}");
  const holidays = s.holidaysJson ? JSON.parse(s.holidaysJson) : { items: [] };
  if(holidays?.items?.some((h:any)=>h.date===dateStr)) return NextResponse.json([]);

  const d = new Date(dateStr+"T00:00:00.000Z");
  const weekday = dayKeys[d.getUTCDay()==0?0:d.getUTCDay()]; // 0=Sun
  const cfg = hours[weekday] || { closed:true, ranges:[] };
  if(cfg.closed || !cfg.ranges?.length) return NextResponse.json([]);

  const slotM = s.slotMinutes ?? 30;
  const bufM  = s.bufferMinutes ?? 0;

  // Bestehende Buchungen am Tag
  const dayStart = new Date(dateStr+"T00:00:00.000Z");
  const dayEnd   = new Date(addMinutes(dayStart, 24*60));
  const existing = await prisma.booking.findMany({
    where: {
      businessId: biz.id,
      start: { gte: dayStart, lt: dayEnd },
      NOT: { status: { in: [BookingStatus.declined, BookingStatus.cancelled] } }
    },
    orderBy: { start: "asc" }
  });

  // Hilfsfunktion: ist ein Slot frei (mit Buffer)
  const isFree = (slot:Date)=>{
    const slotEnd = addMinutes(slot, slotM);
    return !existing.some(b=>{
      const bStart = new Date(b.start);
      const bEnd   = new Date(b.end);
      const blockStart = addMinutes(bStart, -bufM);
      const blockEnd   = addMinutes(bEnd,   bufM);
      return !(slotEnd <= blockStart || slot >= blockEnd);
    });
  };

  const out:{time:string; iso:string}[]=[];
  for(const r of cfg.ranges){
    const startMin = toMinutes(r.from);
    const endMin   = toMinutes(r.to);
    for(let m=startMin; m+slotM<=endMin; m+=slotM){
      const slot = addMinutes(dayStart, m);
      if(isFree(slot)){
        const hh = String(slot.getUTCHours()).padStart(2,"0");
        const mm = String(slot.getUTCMinutes()).padStart(2,"0");
        out.push({ time: `${hh}:${mm}`, iso: slot.toISOString() });
      }
    }
  }
  return NextResponse.json(out);
}