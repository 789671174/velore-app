import { prisma } from "@/app/lib/prisma";

export async function resolveBusiness(tenant?: string | null) {
  const slug = (tenant || process.env.DEFAULT_TENANT || "").toLowerCase().trim();
  if (!slug) return null;
  const biz = await prisma.business.findUnique({ where: { slug } });
  return biz;
}

// Für API: tenant aus URL (?t=) oder Header x-tenant holen
export function getTenantFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("t");
    if (q) return q;
  } catch {}
  const h = (req.headers.get("x-tenant") || "").trim();
  return h || null;
}
