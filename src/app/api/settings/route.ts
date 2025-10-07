// app/api/settings/route.ts
import { kv } from "@vercel/kv";

// Key-Helfer: optionaler Mandant (tenant) → eigener KV-Key
function key(tenant?: string | null) {
  return `velora:settings${tenant ? `:${tenant}` : ""}`;
}

// GET /api/settings?tenant=slug
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant");

  try {
    const data = await kv.get<unknown>(key(tenant));
    return Response.json(data ?? null, { status: 200 });
  } catch (e) {
    // Falls KV nicht konfiguriert ist
    return Response.json(
      { error: "KV not configured" },
      { status: 500 }
    );
  }
}

// POST /api/settings
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tenant: string | null = body.tenant ?? null;

  // sehr einfache Validierung
  const payload = {
    tenant,
    companyName: String(body.companyName ?? ""),
    email: String(body.email ?? ""),
    workingDays: Array.isArray(body.workingDays) ? body.workingDays : [],
    openFrom: String(body.openFrom ?? "09:00"),
    openTo: String(body.openTo ?? "18:00"),
    vacationRange: {
      start: body?.vacationRange?.start ?? null,
      end: body?.vacationRange?.end ?? null,
    },
    holidays: Array.isArray(body.holidays) ? body.holidays : [],
    logo: typeof body.logo === "string" ? body.logo : null, // base64 Data URL
    updatedAt: new Date().toISOString(),
  };

  try {
    await kv.set(key(tenant), payload);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    // Fallback: kein KV → nicht abstürzen
    return Response.json(
      { error: "KV not configured", saved: false },
      { status: 500 }
    );
  }
}
