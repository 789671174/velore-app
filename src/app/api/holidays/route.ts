import { NextResponse } from "next/server";

import { ensureTenantWithSettings } from "@/lib/tenant";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant");

  if (!tenantSlug) {
    return NextResponse.json({ message: "Tenant erforderlich" }, { status: 400 });
  }

  const tenant = await ensureTenantWithSettings(tenantSlug);

  if (!tenant || !tenant.settings) {
    return NextResponse.json({ message: "Tenant nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ holidays: tenant.settings.holidays });
}
