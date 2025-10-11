import { notFound, redirect } from "next/navigation";

import { prisma } from "@/app/lib/prisma";
import { normalizeTenantSlug } from "@/app/lib/tenant";

type PageProps = {
  params: {
    tenant?: string;
  };
};

export default async function TenantEntrepreneurPage({ params }: PageProps) {
  const slug = normalizeTenantSlug(params?.tenant);
  if (!slug) {
    return notFound();
  }

  const tenant = await prisma.business.findUnique({ where: { slug } });
  if (!tenant) {
    return notFound();
  }

  redirect(`/t/${tenant.slug}/entrepreneur/dashboard`);
}
