/* eslint-disable no-console */
import { BookingStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOURS = [
  { day: "Mon", enabled: true, open: "09:00", close: "18:00", breaks: [{ start: "12:30", end: "13:00" }] },
  { day: "Tue", enabled: true, open: "09:00", close: "18:00", breaks: [{ start: "12:30", end: "13:00" }] },
  { day: "Wed", enabled: true, open: "09:00", close: "18:00", breaks: [{ start: "12:30", end: "13:00" }] },
  { day: "Thu", enabled: true, open: "09:00", close: "20:00", breaks: [{ start: "14:00", end: "14:30" }] },
  { day: "Fri", enabled: true, open: "09:00", close: "18:00", breaks: [] },
  { day: "Sat", enabled: false, open: "09:00", close: "14:00", breaks: [] },
  { day: "Sun", enabled: false, open: "09:00", close: "14:00", breaks: [] },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "velora-hairstyles" },
    update: {},
    create: {
      name: "Velora Hairstyles",
      slug: "velora-hairstyles",
    },
  });

  await prisma.settings.upsert({
    where: { tenantId: tenant.id },
    update: {
      businessName: "Velora Hairstyles",
      email: "booking@velora.example",
      phone: "+49 30 123456",
      address: "Kurfürstendamm 100, 10709 Berlin",
      notes: "Bitte 5 Minuten vor dem Termin erscheinen.",
      businessHours: HOURS,
      holidays: ["2025-12-24", "2025-12-25"],
    },
    create: {
      tenantId: tenant.id,
      businessName: "Velora Hairstyles",
      email: "booking@velora.example",
      phone: "+49 30 123456",
      address: "Kurfürstendamm 100, 10709 Berlin",
      notes: "Bitte 5 Minuten vor dem Termin erscheinen.",
      businessHours: HOURS,
      holidays: ["2025-12-24", "2025-12-25"],
    },
  });

  const customers = await Promise.all(
    [
      { firstName: "Lea", lastName: "Sommer", email: "lea@example.com", phone: "+49 170 1234567" },
      { firstName: "Jonas", lastName: "Müller", email: "jonas@example.com", phone: "+49 171 9876543" },
      { firstName: "Mira", lastName: "Becker", email: "mira@example.com" },
    ].map((customer) =>
      prisma.customer.upsert({
        where: { email_tenantId: { email: customer.email, tenantId: tenant.id } },
        update: customer,
        create: { tenantId: tenant.id, ...customer },
      }),
    ),
  );

  await prisma.booking.deleteMany({ where: { tenantId: tenant.id } });

  const baseDate = new Date();
  const isoDate = (offset: number) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  await prisma.booking.createMany({
    data: [
      {
        tenantId: tenant.id,
        customerId: customers[0].id,
        date: isoDate(0),
        startTime: "10:00",
        endTime: "10:45",
        status: BookingStatus.confirmed,
      },
      {
        tenantId: tenant.id,
        customerId: customers[1].id,
        date: isoDate(1),
        startTime: "14:00",
        endTime: "14:45",
        status: BookingStatus.pending,
      },
      {
        tenantId: tenant.id,
        customerId: customers[2].id,
        date: isoDate(2),
        startTime: "09:15",
        endTime: "10:00",
        status: BookingStatus.pending,
      },
      {
        tenantId: tenant.id,
        customerId: customers[0].id,
        date: isoDate(-1),
        startTime: "16:00",
        endTime: "16:45",
        status: BookingStatus.cancelled,
      },
      {
        tenantId: tenant.id,
        customerId: customers[1].id,
        date: isoDate(5),
        startTime: "11:00",
        endTime: "11:45",
        status: BookingStatus.pending,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed for tenant", tenant.slug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
