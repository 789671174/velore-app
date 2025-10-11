import { notFound, redirect } from "next/navigation";

type Props = {
  params: {
    tenant?: string;
  };
};

export default function TenantEntrepreneurPage({ params }: Props) {
  const slug = params?.tenant?.trim().toLowerCase();
  if (!slug) {
    notFound();
  }

  redirect(`/t/${slug}/entrepreneur/settings`);
  return null;
}
