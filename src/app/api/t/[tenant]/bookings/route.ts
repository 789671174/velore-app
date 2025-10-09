import { NextResponse } from "next/server";
import { createBooking, ensureTenant, listBookings } from "@/app/lib/store";

function parseDate(date: string, time: string) {
  const iso = `${date}T${time}:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ungültiges Datum oder Uhrzeit");
  }
  return parsed;
}

export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date");
  const bookings = await listBookings(params.tenant);

  const filtered = dateFilter
    ? bookings.filter((b) => b.start.startsWith(`${dateFilter}T`))
    : bookings;

  return NextResponse.json(filtered);
}

export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenant = await ensureTenant(params.tenant);
    const body = await req.json();

    const required = ["firstName", "lastName", "email", "date", "time"] as const;
    for (const field of required) {
      if (!body?.[field]) {
        return NextResponse.json(
          { error: `Feld \"${field}\" ist erforderlich.` },
          { status: 400 }
        );
      }
    }

    const start = parseDate(body.date, body.time);
    const created = await createBooking(params.tenant, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      start: start.toISOString(),
      end: new Date(
        start.getTime() +
          (tenant.settings.slotMinutes + tenant.settings.bufferMinutes) * 60_000
      ).toISOString(),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /bookings failed", error);
    const message = error instanceof Error ? error.message : "Fehler";
    const status = message.includes("reserviert") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
