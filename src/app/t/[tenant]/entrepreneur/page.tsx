// Server component: validate tenant, then redirect server-side to dashboard.
// No client hooks here.

import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { normalizeTenantSlug } from "@/app/lib/tenant";

type Params = { params: { tenant?: string } };

export default async function EntrepreneurEntry({ params }: Params) {
  const slug = normalizeTenantSlug(params.tenant);
  if (!slug) {
    notFound();
  }

  const tenant = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  // SSR redirect (no useEffect)
  redirect(`/t/${tenant.slug}/entrepreneur/dashboard`);
}
