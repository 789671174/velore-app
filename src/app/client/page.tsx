import { redirect } from "next/navigation";
const TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT || process.env.DEFAULT_TENANT || "velora-hairstyles";
export default function Page() {
  redirect(/t/\/client);
}
