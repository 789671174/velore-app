/* eslint-disable */
import { prisma } from "@/app/lib/prisma";

const DEFAULT_HOURS: Record<number, { from: string; to: string }[]> = {
  1: [{ from: "09:00", to: "17:00" }],
  2: [{ from: "09:00", to: "17:00" }],
  3: [{ from: "09:00", to: "17:00" }],
  4: [{ from: "09:00", to: "17:00" }],
  5: [{ from: "09:00", to: "15:00" }],
};

async function main() {
  const slug = (process.env.DEFAULT_TENANT || "velora-hairstyles").toLowerCase();
  let business = await prisma.business.findUnique({ where: { slug } });

  if (!business) {
    business = await prisma.business.create({
      data: {
        slug,
        name: "Velora hairstyles",
        email: "info@velora.example",
        timezone: "Europe/Zurich",
        logoDataUrl: null,
        settings: {
          create: {
            slotMinutes: 30,
            bufferMinutes: 0,
            hoursJson: JSON.stringify(DEFAULT_HOURS),
            workDaysJson: JSON.stringify([1, 2, 3, 4, 5]),
            vacationDaysJson: JSON.stringify([]),
            bookingNotes:
              "Bitte erscheinen Sie 5 Minuten vor dem Termin. Terminabsagen sind bis 24 Stunden vorher kostenfrei möglich.",
          },
        },
      },
    });
    console.log("Created business:", business.slug);
  } else {
    console.log("Business exists:", business.slug);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
