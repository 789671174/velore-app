"use client";

import { useEffect, useState } from "react";

import type { Business, Settings } from "@prisma/client";

import type { Holiday } from "@/app/types";
import type { TimeRange, VacationRange } from "@/app/lib/settings";
import {
  DEFAULT_HOURS,
  DEFAULT_WORK_DAYS,
  normalizeHours,
  normalizeWorkDays,
  safeParseJson,
  sanitizeVacationRanges,
} from "@/app/lib/settings";

type Props = {
  tenant: string;
  business: Business;
  initialSettings: Settings;
};

const DAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

const createDefaultInterval = (): TimeRange => ({ from: "09:00", to: "17:00" });

export default function SettingsView({ tenant, business, initialSettings }: Props) {
  const [name, setName] = useState(business.name);
  const [email, setEmail] = useState(business.email ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState(business.logoDataUrl ?? "");
  const [slotMinutes, setSlotMinutes] = useState(initialSettings.slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(initialSettings.bufferMinutes);
  const [bookingNotes, setBookingNotes] = useState(initialSettings.bookingNotes ?? "");

  const [workDays, setWorkDays] = useState<number[]>(() => {
    const parsed = normalizeWorkDays(safeParseJson(initialSettings.workDaysJson, DEFAULT_WORK_DAYS));
    return parsed.length ? parsed : DEFAULT_WORK_DAYS;
  });

  const [hours, setHours] = useState<Record<number, TimeRange[]>>(() => {
    const parsed = normalizeHours(safeParseJson(initialSettings.hoursJson, DEFAULT_HOURS));
    return Object.keys(parsed).length ? parsed : DEFAULT_HOURS;
  });

  const [vacations, setVacations] = useState<VacationRange[]>(() =>
    sanitizeVacationRanges(safeParseJson(initialSettings.vacationDaysJson, [] as VacationRange[])),
  );

  const [vacationDraft, setVacationDraft] = useState<VacationRange>({ start: "", end: "", note: "" });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDraft, setHolidayDraft] = useState<{ date: string; reason: string }>({ date: "", reason: "" });
  const [holidayLoading, setHolidayLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadHolidays() {
      try {
        setHolidayLoading(true);
        const res = await fetch(`/api/holidays?t=${tenant}`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Holiday[];
        if (!ignore) {
          setHolidays(data);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(`Feiertage konnten nicht geladen werden: ${err?.message ?? err}`);
        }
      } finally {
        if (!ignore) {
          setHolidayLoading(false);
        }
      }
    }

    loadHolidays();
    return () => {
      ignore = true;
    };
  }, [tenant]);

  const toggleDay = (day: number) => {
    setWorkDays((prev) => {
      const exists = prev.includes(day);
      if (exists) {
        return prev.filter((value) => value !== day);
      }

      setHours((prevHours) => {
        if (prevHours[day]?.length) return prevHours;
        return { ...prevHours, [day]: [createDefaultInterval()] };
      });

      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const updateInterval = (day: number, index: number, key: keyof TimeRange, value: string) => {
    setHours((prev) => {
      const next = { ...prev };
      const ranges = [...(next[day] ?? [])];
      const range = { ...(ranges[index] ?? createDefaultInterval()) };
      range[key] = value;
      ranges[index] = range;
      next[day] = ranges;
      return next;
    });
  };

  const addInterval = (day: number) => {
    setHours((prev) => {
      const next = { ...prev };
      const ranges = [...(next[day] ?? [])];
      ranges.push(createDefaultInterval());
      next[day] = ranges;
      return next;
    });
  };

  const removeInterval = (day: number, index: number) => {
    setHours((prev) => {
      const next = { ...prev };
      const ranges = [...(next[day] ?? [])];
      ranges.splice(index, 1);
      next[day] = ranges;
      return next;
    });
  };

  const handleLogoFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Bitte eine Datei kleiner als 2 MB verwenden.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const addVacation = () => {
    setError(null);
    setMessage("");
    if (!vacationDraft.start) {
      setError("Bitte ein Startdatum für den Ferienzeitraum wählen.");
      return;
    }
    if (vacationDraft.end && vacationDraft.end < vacationDraft.start) {
      setError("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }

    const entry: VacationRange = {
      start: vacationDraft.start,
      end: vacationDraft.end || undefined,
      note: vacationDraft.note?.trim() || undefined,
    };

    setVacations((prev) => [...prev, entry].sort((a, b) => a.start.localeCompare(b.start)));
    setVacationDraft({ start: "", end: "", note: "" });
  };

  const removeVacation = (index: number) => {
    setVacations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addHoliday = async () => {
    setError(null);
    setMessage("");
    if (!holidayDraft.date) {
      setError("Bitte ein Datum für den Feiertag auswählen.");
      return;
    }

    try {
      setHolidayLoading(true);
      const res = await fetch(`/api/holidays?t=${tenant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: holidayDraft.date, reason: holidayDraft.reason || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Holiday;
      setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setHolidayDraft({ date: "", reason: "" });
      setMessage("Feiertag gespeichert.");
    } catch (err: any) {
      setError(`Feiertag konnte nicht gespeichert werden: ${err?.message ?? err}`);
    } finally {
      setHolidayLoading(false);
    }
  };

  const removeHoliday = async (id: string) => {
    setError(null);
    setMessage("");
    try {
      setHolidayLoading(true);
      const res = await fetch(`/api/holidays?id=${id}&t=${tenant}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
    } catch (err: any) {
      setError(`Feiertag konnte nicht entfernt werden: ${err?.message ?? err}`);
    } finally {
      setHolidayLoading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const payload = {
        tenant,
        name: name.trim() || business.name,
        email: email.trim() || undefined,
        logoDataUrl: logoDataUrl.trim() || null,
        slotMinutes: Number(slotMinutes),
        bufferMinutes: Number(bufferMinutes),
        workDays,
        hours,
        vacationDays: vacations,
        bookingNotes: bookingNotes.trim() || null,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setMessage("Einstellungen gespeichert.");
    } catch (err: any) {
      setError(`Speichern fehlgeschlagen: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Einstellungen – {name || business.name}</h1>
        <p className="text-sm text-neutral-500">Tenant: {tenant}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {message && !error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-neutral-900">Unternehmensprofil</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="business-name">
              Unternehmensname
            </label>
            <input
              id="business-name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Velora GmbH"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="business-email">
              Kontakt-E-Mail
            </label>
            <input
              id="business-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kontakt@unternehmen.ch"
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-14 w-14 rounded-lg border border-neutral-200 object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
                Kein Logo
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-neutral-700">Logo aktualisieren</label>
              <input
                type="file"
                accept="image/*"
                className="mt-2 block text-sm text-neutral-600"
                onChange={(event) => handleLogoFile(event.target.files?.[0])}
              />
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => setLogoDataUrl("")}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Logo entfernen
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Arbeitszeiten &amp; Arbeitstage</h2>
          <p className="text-xs text-neutral-500">Zeiten gelten pro Wochentag.</p>
        </div>
        <div className="mt-4 space-y-4">
          {DAY_LABELS.map((label, index) => {
            const isActive = workDays.includes(index);
            const ranges = hours[index] ?? [];
            return (
              <div key={label} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleDay(index)}
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => addInterval(index)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      + Zeitfenster
                    </button>
                  )}
                </div>

                {isActive && (
                  <div className="mt-3 space-y-2">
                    {(ranges.length ? ranges : [createDefaultInterval()]).map((range, rangeIndex) => (
                      <div key={rangeIndex} className="flex flex-wrap items-center gap-3">
                        <input
                          type="time"
                          value={range.from}
                          onChange={(event) => updateInterval(index, rangeIndex, "from", event.target.value)}
                          className="w-32 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-sm text-neutral-500">bis</span>
                        <input
                          type="time"
                          value={range.to}
                          onChange={(event) => updateInterval(index, rangeIndex, "to", event.target.value)}
                          className="w-32 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInterval(index, rangeIndex)}
                            className="text-sm font-medium text-red-600 hover:text-red-500"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-neutral-900">Ferienzeiten</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="vacation-start">
              Startdatum
            </label>
            <input
              id="vacation-start"
              type="date"
              className={inputClass}
              value={vacationDraft.start ?? ""}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, start: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="vacation-end">
              Enddatum
            </label>
            <input
              id="vacation-end"
              type="date"
              className={inputClass}
              value={vacationDraft.end ?? ""}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, end: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="vacation-note">
              Notiz (optional)
            </label>
            <input
              id="vacation-note"
              className={inputClass}
              value={vacationDraft.note ?? ""}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Sommerferien"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={addVacation}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
          >
            Ferienzeit hinzufügen
          </button>
          <p className="text-xs text-neutral-500">Ferienzeiträume blockieren die Terminbuchung vollständig.</p>
        </div>

        {vacations.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {vacations.map((vacation, index) => (
              <li
                key={`${vacation.start}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                <span>
                  {vacation.start}
                  {vacation.end ? ` – ${vacation.end}` : ""}
                  {vacation.note ? ` · ${vacation.note}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeVacation(index)}
                  className="text-xs font-medium text-red-600 hover:text-red-500"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-neutral-900">Feiertage</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="holiday-date">
              Datum
            </label>
            <input
              id="holiday-date"
              type="date"
              className={inputClass}
              value={holidayDraft.date}
              onChange={(event) => setHolidayDraft((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="holiday-reason">
              Bezeichnung
            </label>
            <input
              id="holiday-reason"
              className={inputClass}
              value={holidayDraft.reason}
              onChange={(event) => setHolidayDraft((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Bundesfeier"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addHoliday}
          disabled={holidayLoading}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 disabled:opacity-60"
        >
          Feiertag hinzufügen
        </button>

        {holidays.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {holidays.map((holiday) => (
              <li
                key={holiday.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                <span>
                  {holiday.date}
                  {holiday.reason ? ` · ${holiday.reason}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeHoliday(holiday.id)}
                  disabled={holidayLoading}
                  className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-60"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">Noch keine Feiertage erfasst.</p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-neutral-900">Allgemeine Einstellungen</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="slot-minutes">
              Slotdauer (Minuten)
            </label>
            <input
              id="slot-minutes"
              type="number"
              min={5}
              step={5}
              className={inputClass}
              value={slotMinutes}
              onChange={(event) => setSlotMinutes(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="buffer-minutes">
              Puffer zwischen Terminen (Minuten)
            </label>
            <input
              id="buffer-minutes"
              type="number"
              min={0}
              step={5}
              className={inputClass}
              value={bufferMinutes}
              onChange={(event) => setBufferMinutes(Number(event.target.value))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium text-neutral-700" htmlFor="booking-notes">
              Hinweise für Kund:innen
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              className={`${inputClass} min-h-[120px] resize-y`}
              value={bookingNotes}
              onChange={(event) => setBookingNotes(event.target.value)}
              placeholder="Bitte 5 Minuten vor dem Termin eintreffen."
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? "Speichern…" : "Einstellungen speichern"}
        </button>
      </div>
    </div>
  );
}
