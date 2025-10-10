"use client";

import { format, isBefore, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@/lib/resolvers/zod";
import { buildTimeSlots, type BusinessHour } from "@/lib/time";
import { bookingSchema, type BookingInput } from "@/lib/validators/booking";

interface BookingFormProps {
  tenant: string;
  businessName: string;
  businessHours: BusinessHour[];
  holidays: string[];
}

export function BookingForm({ tenant, businessName, businessHours, holidays }: BookingFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      tenant,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "",
      endTime: "",
      notes: "",
      termsAccepted: false,
    },
  });

  const dateValue = watch("date");
  const selectedDate = useMemo(() => {
    if (!dateValue) {
      return new Date();
    }

    const parsed = parseISO(dateValue);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dateValue]);

  const selectedStartTime = watch("startTime");

  const timeSlots = useMemo(() => {
    const now = new Date();

    return buildTimeSlots(selectedDate, businessHours, holidays).filter((slot) => {
      if (!isSameDay(slot.start, selectedDate)) {
        return true;
      }

      return !isBefore(slot.start, now);
    });
  }, [selectedDate, businessHours, holidays]);

  const onSubmit = async (data: BookingInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/${tenant}/booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message ?? "Buchung konnte nicht gespeichert werden");
      }

      toast.success("Termin wurde angefragt", {
        description: `${data.firstName} ${data.lastName}, wir melden uns per E-Mail zur Bestätigung.`,
      });

      reset({
        ...data,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        termsAccepted: false,
        startTime: "",
        endTime: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <input type="hidden" value={tenant} {...register("tenant")} />
      <input type="hidden" {...register("startTime")} />
      <input type="hidden" {...register("endTime")} />
      <Card>
        <CardHeader>
          <CardTitle>1 · Deine Kontaktdaten</CardTitle>
          <CardDescription>
            Wir nutzen deine Angaben, um dich zur Terminbestätigung zu kontaktieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Vorname</Label>
            <Input id="firstName" placeholder="Alex" {...register("firstName")} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nachname</Label>
            <Input id="lastName" placeholder="Muster" {...register("lastName")} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" placeholder="du@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (optional)</Label>
            <Input id="phone" placeholder="+49..." {...register("phone")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea id="notes" placeholder="Spezielle Wünsche?" {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Datum wählen</CardTitle>
          <CardDescription>Freie Tage richten sich nach den Öffnungszeiten von {businessName}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[320px_1fr]">
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Calendar
                mode="single"
                selected={parseISO(field.value)}
                onSelect={(day) => day && field.onChange(format(day, "yyyy-MM-dd"))}
                disabled={(day) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const currentDay = new Date(day);
                  currentDay.setHours(0, 0, 0, 0);
                  return currentDay < today || holidays.includes(format(day, "yyyy-MM-dd"));
                }}
                locale={de}
              />
            )}
          />
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase text-muted-foreground">Verfügbare Zeiten</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {timeSlots.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine freien Slots – wähle ein anderes Datum.</p>
              )}
              {timeSlots.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => {
                    setValue("startTime", format(slot.start, "HH:mm"), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setValue("endTime", format(slot.end, "HH:mm"), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  aria-pressed={selectedStartTime === format(slot.start, "HH:mm")}
                  aria-label={`Zeitslot ${slot.label}`}
                  className={cn(
                    "rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedStartTime === format(slot.start, "HH:mm") &&
                      "border-primary bg-primary/10 text-primary shadow-sm",
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            {errors.startTime && <p className="text-sm text-destructive">Bitte Zeitfenster auswählen.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · Bestätigen</CardTitle>
          <CardDescription>Bitte bestätige, dass du unsere Bedingungen gelesen hast.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <Controller
              name="termsAccepted"
              control={control}
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(!!checked)} />
              )}
            />
            <span>
              Ich akzeptiere die AGB und Datenschutzerklärung von {businessName}.
              {errors.termsAccepted && (
                <span className="mt-1 block text-sm text-destructive">{errors.termsAccepted.message}</span>
              )}
            </span>
          </label>
          <Button type="submit" size="lg" disabled={submitting} className="w-full md:w-auto">
            {submitting ? "Sende Anfrage…" : "Termin anfragen"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
