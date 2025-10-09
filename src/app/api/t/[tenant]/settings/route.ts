import { NextResponse } from "next/server";
import { ensureTenant, updateSettings } from "@/app/lib/store";

type SettingsPayload = {
  companyName?: string;
  email?: string;
  workingDays?: string[];
  openFrom?: string;
  openTo?: string;
  slotMinutes?: number;
  bufferMinutes?: number;
};

function sanitize(payload: SettingsPayload) {
  return {
    companyName: payload.companyName ?? "",
    email: payload.email ?? "",
    workingDays: Array.isArray(payload.workingDays)
      ? payload.workingDays.filter((d) => typeof d === "string")
      : undefined,
    openFrom: payload.openFrom ?? "09:00",
    openTo: payload.openTo ?? "18:00",
    slotMinutes: Number(payload.slotMinutes ?? 30),
    bufferMinutes: Number(payload.bufferMinutes ?? 0),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { tenant: string } }
) {
  const tenant = await ensureTenant(params.tenant);
  return NextResponse.json(tenant.settings);
}

export async function PUT(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    const payload = sanitize(await req.json());
    const settings = await updateSettings(params.tenant, payload);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /settings failed", error);
    return NextResponse.json(
      { error: "Einstellungen konnten nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: { params: { tenant: string } }) {
  return PUT(req, ctx);
}
