import { notFound } from "next/navigation";

import { Dashboard } from "@/components/entrepreneur/Dashboard";
import { prisma } from "@/lib/prisma";

interface EntrepreneurPageProps {
  params: { tenant: string };
}

export default async function EntrepreneurPage({ params }: EntrepreneurPageProps) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant },
  });

  if (!tenant) {
    notFound();
  }

  const bookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
    ],
    include: {
      customer: true,
    },
  });

  const normalized = bookings.map((booking) => ({
    id: booking.id,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    notes: booking.notes,
    customer: {
      firstName: booking.customer.firstName,
      lastName: booking.customer.lastName,
      email: booking.customer.email,
      phone: booking.customer.phone,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Überblick über aktuelle Buchungen und Kennzahlen für {tenant.name}.
        </p>
      </div>
      <Dashboard tenant={tenant.slug} bookings={normalized} />
    </div>
  );
}
