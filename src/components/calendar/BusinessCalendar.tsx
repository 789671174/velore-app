"use client";

import { format, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";

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
              booked: bookings.map((booking) => parseISO(booking.date)),
            }}
            modifiersClassNames={{
              booked: "bg-primary/10 text-primary",
            }}
          />
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
            <div key={booking.id} className="rounded-lg border p-4">
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
                <Badge
                  variant={
                    booking.status === "pending"
                      ? "secondary"
                      : booking.status === "confirmed"
                      ? "default"
                      : "destructive"
                  }
                >
                  {booking.status === "pending"
                    ? "Offen"
                    : booking.status === "confirmed"
                    ? "Bestätigt"
                    : "Storniert"}
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
