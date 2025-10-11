// Server component: validate tenant, then redirect server-side to dashboard.
// No client hooks here.

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Params = { params: { tenant: string } };

export default async function EntrepreneurEntry({ params }: Params) {
  const slug = params.tenant;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    // Graceful 404 instead of crashing the server
    notFound();
  }

  // SSR redirect (no useEffect)
  redirect(`/t/${tenant.slug}/entrepreneur/dashboard`);
}
