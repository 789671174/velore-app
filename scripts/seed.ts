/* eslint-disable */
import { ensureTenant } from "@/app/lib/store";

async function main() {
  const slug = (process.env.NEXT_PUBLIC_DEFAULT_TENANT || "velora-hairstyles").toLowerCase();
  const tenant = await ensureTenant(slug);
  console.log(`Tenant "${tenant.slug}" ist bereit.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
