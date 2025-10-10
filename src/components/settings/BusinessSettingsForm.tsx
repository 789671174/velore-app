"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { getWeekdayLabel } from "@/lib/time";
import { zodResolver } from "@/lib/resolvers/zod";
import { settingsSchema, type SettingsInput } from "@/lib/validators/settings";

interface BusinessSettingsFormProps {
  tenant: string;
  initialData: SettingsInput;
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function BusinessSettingsForm({ tenant, initialData }: BusinessSettingsFormProps) {
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialData,
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "businessHours",
  });

  const holidays = form.watch("holidays");

  const handleHolidaysChange = (days: Date[] | undefined) => {
    const values = Array.from(
      new Set((days ?? []).map((day) => format(day as Date, "yyyy-MM-dd"))),
    ).sort();

    form.setValue("holidays", values, { shouldDirty: true, shouldValidate: true });
  };

  const removeHoliday = (value: string) => {
    form.setValue(
      "holidays",
      (holidays ?? []).filter((holiday) => holiday !== value),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = async (values: SettingsInput) => {
    const res = await fetch(`/api/tenant/${tenant}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.message ?? "Speichern fehlgeschlagen");
      return;
    }

    toast.success("Einstellungen gespeichert");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>1 · Unternehmensprofil</CardTitle>
          <CardDescription>Basisinfos für Bestätigungen und E-Mail-Kommunikation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Firmenname</Label>
            <Input id="businessName" {...form.register("businessName")} />
            {form.formState.errors.businessName && (
              <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" placeholder="+49…" {...form.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" placeholder="Straße, Stadt" {...form.register("address")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Hinweise für Kund:innen</Label>
            <Textarea id="notes" rows={4} placeholder="Bitte 5 Minuten vor Termin erscheinen…" {...form.register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Arbeitszeiten</CardTitle>
          <CardDescription>Definiere Öffnungszeiten und Pausen pro Tag.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAY_ORDER.map((day) => {
            const fieldIndex = fields.findIndex((field) => field.day === day);
            if (fieldIndex === -1) {
              return null;
            }

            const item = fields[fieldIndex];
            const dayErrors = form.formState.errors.businessHours?.[fieldIndex];
            return (
              <div key={day} className="grid gap-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{getWeekdayLabel(day)} ({day})</p>
                    <p className="text-sm text-muted-foreground">
                      {form.watch(`businessHours.${fieldIndex}.open`)} –
                      {" "}
                      {form.watch(`businessHours.${fieldIndex}.close`)} Uhr
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.watch(`businessHours.${fieldIndex}.enabled`)}
                      onCheckedChange={(checked) =>
                        update(fieldIndex, {
                          ...item,
                          enabled: !!checked,
                        })
                      }
                    />
                    Aktiv
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Öffnet</Label>
                    <Input
                      type="time"
                      step={900}
                      disabled={!form.watch(`businessHours.${fieldIndex}.enabled`)}
                      value={form.watch(`businessHours.${fieldIndex}.open`)}
                      onChange={(event) =>
                        update(fieldIndex, {
                          ...item,
                          open: event.target.value,
                        })
                      }
                    />
                    {dayErrors?.open && (
                      <p className="text-sm text-destructive">{dayErrors.open.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Schließt</Label>
                    <Input
                      type="time"
                      step={900}
                      disabled={!form.watch(`businessHours.${fieldIndex}.enabled`)}
                      value={form.watch(`businessHours.${fieldIndex}.close`)}
                      onChange={(event) =>
                        update(fieldIndex, {
                          ...item,
                          close: event.target.value,
                        })
                      }
                    />
                    {dayErrors?.close && (
                      <p className="text-sm text-destructive">{dayErrors.close.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Pausen</Label>
                  {item.breaks?.length ? (
                    <div className="space-y-2">
                      {item.breaks.map((pause, pauseIndex) => (
                        <div key={`${day}-${pauseIndex}`} className="flex flex-wrap items-center gap-2">
                          <Input
                            type="time"
                            step={900}
                            className="w-32"
                            value={pause.start}
                            onChange={(event) => {
                              const next = [...item.breaks];
                              next[pauseIndex] = { ...pause, start: event.target.value };
                              update(fieldIndex, { ...item, breaks: next });
                            }}
                          />
                          <span>bis</span>
                          <Input
                            type="time"
                            step={900}
                            className="w-32"
                            value={pause.end}
                            onChange={(event) => {
                              const next = [...item.breaks];
                              next[pauseIndex] = { ...pause, end: event.target.value };
                              update(fieldIndex, { ...item, breaks: next });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              const next = item.breaks.filter((_, idx) => idx !== pauseIndex);
                              update(fieldIndex, { ...item, breaks: next });
                            }}
                          >
                            Entfernen
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Pausen definiert.</p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!form.watch(`businessHours.${fieldIndex}.enabled`)}
                    onClick={() =>
                      update(fieldIndex, {
                        ...item,
                        breaks: [...(item.breaks ?? []), { start: "12:00", end: "12:30" }],
                      })
                    }
                  >
                    Pause hinzufügen
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · Feiertage & Abwesenheiten</CardTitle>
          <CardDescription>Pflege besondere Tage, an denen keine Buchungen möglich sind.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              <Calendar
                mode="multiple"
                selected={(holidays ?? []).map((day) => new Date(day))}
                onSelect={handleHolidaysChange}
                locale={de}
              />
              <p className="text-sm text-muted-foreground">
                {(holidays ?? []).length} Tage ausgewählt
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Ausgewählte Tage</p>
              <div className="flex flex-wrap gap-2">
                {(holidays ?? []).map((value) => (
                  <span key={value} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                    {format(new Date(value), "dd.MM.yyyy", { locale: de })}
                    <button
                      type="button"
                      className="text-muted-foreground transition hover:text-destructive"
                      onClick={() => removeHoliday(value)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(holidays ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Sondertage hinterlegt.</p>
                )}
              </div>
            </div>
          </div>
          {form.formState.errors.holidays && (
            <p className="text-sm text-destructive">{form.formState.errors.holidays.message as string}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Speichern
        </Button>
      </div>
    </form>
  );
}
