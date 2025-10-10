"use client";

import { format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { bookingStatusTheme, mixedStatusTheme, type BookingStatusKey } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  status: "pending" | "confirmed" | "cancelled";
  notes?: string | null;
}

interface BusinessCalendarProps {
  bookings: BookingItem[];
}

export function BusinessCalendar({ bookings }: BusinessCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const filtered = useMemo(() => {
    return bookings.filter((booking) => isSameDay(parseISO(booking.date), selectedDate));
  }, [bookings, selectedDate]);

  const calendarModifiers = useMemo(() => {
    const grouped = new Map<string, Set<BookingItem["status"]>>();

    for (const booking of bookings) {
      const daySet = grouped.get(booking.date) ?? new Set<BookingItem["status"]>();
      daySet.add(booking.status);
      grouped.set(booking.date, daySet);
    }

    const result = {
      confirmed: [] as Date[],
      pending: [] as Date[],
      cancelled: [] as Date[],
      mixed: [] as Date[],
    };

    for (const [date, statuses] of grouped.entries()) {
      const parsed = parseISO(date);
      if (statuses.size > 1) {
        result.mixed.push(parsed);
      } else {
        const [status] = Array.from(statuses);
        result[status].push(parsed);
      }
    }

    return result;
  }, [bookings]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Kalender</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(day) => day && setSelectedDate(day)}
            locale={de}
            modifiers={{
              confirmed: calendarModifiers.confirmed,
              pending: calendarModifiers.pending,
              cancelled: calendarModifiers.cancelled,
              mixed: calendarModifiers.mixed,
            }}
            modifiersClassNames={{
              confirmed: bookingStatusTheme.confirmed.calendarClass,
              pending: bookingStatusTheme.pending.calendarClass,
              cancelled: bookingStatusTheme.cancelled.calendarClass,
              mixed: mixedStatusTheme.calendarClass,
            }}
          />
          <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
            {(Object.keys(bookingStatusTheme) as BookingStatusKey[]).map((status) => (
              <span key={status} className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", bookingStatusTheme[status].legendDotClass)}
                  aria-hidden
                />
                <span className="flex items-center gap-1">
                  {bookingStatusTheme[status].label}
                  <span className="text-muted-foreground/70">({calendarModifiers[status].length})</span>
                </span>
              </span>
            ))}
            {calendarModifiers.mixed.length > 0 && (
              <span className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", mixedStatusTheme.legendDotClass)}
                  aria-hidden
                />
                <span className="flex items-center gap-1">
                  {mixedStatusTheme.label}
                  <span className="text-muted-foreground/70">({calendarModifiers.mixed.length})</span>
                </span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Termine am {format(selectedDate, "dd.MM.yyyy", { locale: de })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag.</p>}
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className={cn("rounded-lg border p-4", bookingStatusTheme[booking.status].borderClass)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(`${booking.date}T${booking.startTime}`), "HH:mm")} –
                    {" "}
                    {format(new Date(`${booking.date}T${booking.endTime}`), "HH:mm")} Uhr
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.customer.firstName} {booking.customer.lastName}
                  </p>
                </div>
                <Badge className={bookingStatusTheme[booking.status].badgeClass}>
                  {bookingStatusTheme[booking.status].label}
                </Badge>
              </div>
              <Separator className="my-3" />
              <div className="grid gap-1 text-sm">
                <p>E-Mail: {booking.customer.email}</p>
                {booking.customer.phone && <p>Telefon: {booking.customer.phone}</p>}
                {booking.notes && <p className="text-muted-foreground">Notiz: {booking.notes}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
