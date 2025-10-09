import { kv } from "@vercel/kv";

const KEY = "velore:settings";

export async function GET() {
  try {
    const data = await kv.get(KEY);
    return Response.json(data ?? null, { status: 200 });
  } catch (e) {
    console.error("KV GET error:", e);
    return Response.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    await kv.set(KEY, payload);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("KV POST error:", e);
    return Response.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
}
