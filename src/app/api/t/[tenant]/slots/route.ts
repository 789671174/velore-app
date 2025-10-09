import { NextResponse } from "next/server";
import { ensureTenant } from "@/app/lib/store";

const WEEKDAY_CODES = ["so", "mo", "di", "mi", "do", "fr", "sa"];

function formatTime(date: Date) {
  return date.toISOString().substring(11, 16);
}

export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenant = await ensureTenant(params.tenant);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Parameter 'date' fehlt." }, { status: 400 });
    }

    const weekday = new Date(`${date}T00:00:00`).getDay();
    const code = WEEKDAY_CODES[weekday];
    if (!tenant.settings.workingDays.includes(code)) {
      return NextResponse.json({ slots: [] });
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const isHoliday = tenant.holidays.some((h) => h.date.startsWith(date));
    if (isHoliday) {
      return NextResponse.json({ slots: [] });
    }

    const bookedTimes = new Set(
      tenant.bookings
        .filter((b) => {
          const start = new Date(b.start);
          return start >= dayStart && start <= dayEnd;
        })
        .map((b) => b.start.substring(11, 16))
    );

    const slots: { time: string; iso: string }[] = [];
    const step = tenant.settings.slotMinutes + tenant.settings.bufferMinutes;
    let current = new Date(`${date}T${tenant.settings.openFrom}:00`);
    const end = new Date(`${date}T${tenant.settings.openTo}:00`);

    while (current < end) {
      const label = formatTime(current);
      if (!bookedTimes.has(label)) {
        slots.push({ time: label, iso: current.toISOString() });
      }
      current = new Date(current.getTime() + step * 60_000);
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("GET /slots failed", error);
    return NextResponse.json(
      { error: "Slots konnten nicht berechnet werden." },
      { status: 500 }
    );
  }
}
