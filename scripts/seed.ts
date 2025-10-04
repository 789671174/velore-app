/* eslint-disable */
import { prisma } from "@/app/lib/prisma";

async function main() {
  const slug = (process.env.DEFAULT_TENANT || "velora-hairstyles").toLowerCase();
  let biz = await prisma.business.findUnique({ where: { slug } });
  if (!biz) {
    biz = await prisma.business.create({
      data: {
        slug,
        name: "Velora hairstyles",
        logoDataUrl: null,
        settings: { create: {} }
      }
    });
    console.log("Created business:", biz.slug);
  } else {
    console.log("Business exists:", biz.slug);
  }
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
