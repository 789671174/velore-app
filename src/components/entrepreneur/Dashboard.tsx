import { parseISO } from "date-fns";
import { Suspense } from "react";

import { BookingList, type DashboardBooking } from "@/components/entrepreneur/BookingList";
import { KpiCards } from "@/components/entrepreneur/KpiCards";
import { BusinessCalendar, type BookingItem } from "@/components/calendar/BusinessCalendar";

interface DashboardProps {
  tenant: string;
  bookings: DashboardBooking[];
}

export function Dashboard({ tenant, bookings }: DashboardProps) {
  const today = new Date();
  const todayCount = bookings.filter((booking) => {
    const bookingDate = parseISO(booking.date);
    return bookingDate.toDateString() === today.toDateString();
  }).length;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekCount = bookings.filter((booking) => {
    const date = parseISO(booking.date);
    return date >= startOfWeek && date <= endOfWeek;
  }).length;

  const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
  const cancelRate = bookings.length === 0 ? 0 : (cancelled / bookings.length) * 100;

  return (
    <div className="space-y-8">
      <KpiCards todayCount={todayCount} weekCount={weekCount} cancelRate={cancelRate} />
      <Suspense fallback={<div className="rounded-lg border p-8">Kalender wird geladen…</div>}>
        <BusinessCalendar bookings={bookings as BookingItem[]} />
      </Suspense>
      <BookingList tenant={tenant} bookings={bookings} />
    </div>
  );
}
