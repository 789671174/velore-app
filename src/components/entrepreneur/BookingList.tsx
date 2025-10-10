"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "cancelled" }) => {
      const res = await fetch(`/api/tenant/${tenant}/booking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message ?? "Aktualisierung fehlgeschlagen");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Buchung aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant] });
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktuelle Buchungen</CardTitle>
        <CardDescription>Bearbeite Anfragen und bestätige Termine schnell.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.length === 0 && <p className="text-sm text-muted-foreground">Keine Buchungen vorhanden.</p>}
        {bookings.map((booking) => (
          <div key={booking.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">
                {format(new Date(`${booking.date}T${booking.startTime}`), "dd.MM.yyyy HH:mm", { locale: de })} –
                {" "}
                {format(new Date(`${booking.date}T${booking.endTime}`), "HH:mm", { locale: de })}
              </p>
              <p className="text-sm text-muted-foreground">
                {booking.customer.firstName} {booking.customer.lastName} · {booking.customer.email}
                {booking.customer.phone ? ` · ${booking.customer.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              {booking.status !== "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: booking.id, status: "confirmed" })}
                >
                  Bestätigen
                </Button>
              )}
              {booking.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: booking.id, status: "cancelled" })}
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
