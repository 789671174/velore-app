import { kv } from "@vercel/kv";

function key(tenant?: string | null) {
  return `velora:settings${tenant ? `:${tenant}` : ""}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant");
  try {
    const data = await kv.get(key(tenant));
    return Response.json(data ?? null, { status: 200 });
  } catch (e) {
    console.error("KV GET error:", e);
    return Response.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant");
  try {
    const payload = await req.json();
    await kv.set(key(tenant), payload);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("KV POST error:", e);
    return Response.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
