"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingStatusTheme } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface DashboardBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
}

interface BookingListProps {
  tenant: string;
  bookings: DashboardBooking[];
}

export function BookingList({ tenant, bookings }: BookingListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const updateBooking = async (id: string, status: "confirmed" | "cancelled") => {
    setPendingId(`${id}-${status}`);

    try {
      const res = await fetch(`/api/booking/${id}?tenant=${encodeURIComponent(tenant)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message ?? "Aktualisierung fehlgeschlagen");
      }

      toast.success("Buchung aktualisiert");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen");
    } finally {
      setPendingId(null);
    }
  };

  const isPending = (id: string, status: "confirmed" | "cancelled") => pendingId === `${id}-${status}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktuelle Buchungen</CardTitle>
        <CardDescription>Bearbeite Anfragen und bestätige Termine schnell.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.length === 0 && <p className="text-sm text-muted-foreground">Keine Buchungen vorhanden.</p>}
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between",
              bookingStatusTheme[booking.status].borderClass,
            )}
          >
            <div>
              <p className="font-medium">
                {format(new Date(`${booking.date}T${booking.startTime}`), "dd.MM.yyyy HH:mm", { locale: de })} –{" "}
                {format(new Date(`${booking.date}T${booking.endTime}`), "HH:mm", { locale: de })}
              </p>
              <p className="text-sm text-muted-foreground">
                {booking.customer.firstName} {booking.customer.lastName} · {booking.customer.email}
                {booking.customer.phone ? ` · ${booking.customer.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={bookingStatusTheme[booking.status].badgeClass}>
                {bookingStatusTheme[booking.status].label}
              </Badge>
              {booking.status !== "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/60 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  disabled={isPending(booking.id, "confirmed")}
                  onClick={() => updateBooking(booking.id, "confirmed")}
                >
                  Bestätigen
                </Button>
              )}
              {booking.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isPending(booking.id, "cancelled")}
                  onClick={() => updateBooking(booking.id, "cancelled")}
                >
                  Absagen
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
