import "server-only";
import { ensureTenant, getDefaultTenant } from "@/app/lib/store";

export function getTenantSlug(searchParams?: { t?: string | string[] }) {
  const value = Array.isArray(searchParams?.t) ? searchParams?.t[0] : searchParams?.t;
  const slug = (value ?? getDefaultTenant()).trim();
  if (!slug) {
    throw new Error("Kein Tenant-Slug gefunden. Setze NEXT_PUBLIC_DEFAULT_TENANT oder übergebe ?t=slug.");
  }
  return slug;
}

export async function ensureBusinessWithSettings(slug: string) {
  return ensureTenant(slug);
}
