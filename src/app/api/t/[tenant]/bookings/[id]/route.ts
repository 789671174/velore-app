import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/app/lib/store";

export async function PATCH(
  req: Request,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const body = await req.json();
    if (!body?.status) {
      return NextResponse.json({ error: "Status ist erforderlich." }, { status: 400 });
    }

    const updated = await updateBookingStatus(params.tenant, params.id, body.status);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /bookings/[id] failed", error);
    const message = error instanceof Error ? error.message : "Fehler";
    const status = message.includes("nicht gefunden") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
