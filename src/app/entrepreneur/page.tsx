import { redirect } from "next/navigation";

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "velora-hairstyles";

export default function Page() {
  redirect(`/t/${DEFAULT_TENANT}/dashboard`);
}
