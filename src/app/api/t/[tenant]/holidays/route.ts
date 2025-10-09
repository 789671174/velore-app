import { NextResponse } from "next/server";
import { addHoliday, listHolidays, removeHoliday } from "@/app/lib/store";

function parseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ungültiges Datum");
  }
  return parsed.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: { tenant: string } }
) {
  const holidays = await listHolidays(params.tenant);
  return NextResponse.json(holidays);
}

export async function POST(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const body = await req.json();
    if (!body?.date) {
      return NextResponse.json({ error: "Datum ist erforderlich." }, { status: 400 });
    }
    const date = parseDate(body.date);
    const created = await addHoliday(params.tenant, {
      date,
      reason: body.reason ?? null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /holidays failed", error);
    const message = error instanceof Error ? error.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parameter 'id' fehlt." }, { status: 400 });
    }
    await removeHoliday(params.tenant, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /holidays failed", error);
    const message = error instanceof Error ? error.message : "Fehler";
    const status = message.includes("nicht gefunden") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
