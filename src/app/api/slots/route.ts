import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function addMinutes(time: string, minutes: number): string {
  const [h,m] = time.split(":").map(Number);
  const total = h*60 + m + minutes;
  const hh = Math.floor(total/60).toString().padStart(2,"0");
  const mm = (total%60).toString().padStart(2,"0");
  return `${hh}:${mm}`;
}

function minutesBetween(a: string, b: string) {
  const [ah,am] = a.split(":").map(Number);
  const [bh,bm] = b.split(":").map(Number);
  return (bh*60+bm) - (ah*60+am);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const holidays = await prisma.holiday.findMany();
  const bookings = await prisma.booking.findMany({ where: { date } });

  if (!settings) return NextResponse.json([]);
  if (holidays.some(h => h.date === date)) return NextResponse.json([]);

  const dt = new Date(date + "T00:00:00");
  const weekdayIdx = dt.getDay(); // 0=So..6=Sa
  const map = ["So","Mo","Di","Mi","Do","Fr","Sa"];
  const dayKey = map[weekdayIdx] as any;

  const hoursObj = (() => {
    try { return JSON.parse(settings.hoursJson || "{}"); } catch { return {}; }
  })();
  const cfg = hoursObj[dayKey];
  if (!cfg?.open) return NextResponse.json([]);

  const slots: { time: string; disabled?: boolean }[] = [];
  const step = settings.slotMinutes || 30;
  const buffer = settings.bufferMinutes || 0;
  let t = cfg.start;
  while (minutesBetween(t, cfg.end) >= step) {
    const exists = bookings.some(b => b.time === t && b.status !== "declined");
    slots.push({ time: t, disabled: exists });
    t = addMinutes(t, step + buffer);
  }
  return NextResponse.json(slots);
}
