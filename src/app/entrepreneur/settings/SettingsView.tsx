"use client";

import { useEffect, useMemo, useState } from "react";

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

function StepHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {step}
      </span>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {description ? <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p> : null}
      </div>
    </div>
  );
}

type Props = {
  tenant: string;
  business: Business;
  initialSettings: Settings;
};

type HolidayDraft = {
  date: string;
  reason: string;
};

type VacationDraft = VacationRange;

type HoursState = Record<number, TimeRange[]>;

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

function toHoursState(settings: Settings): HoursState {
  const parsed = normalizeHours(safeParseJson(settings.hoursJson, DEFAULT_HOURS));
  return Object.keys(parsed).length ? parsed : DEFAULT_HOURS;
}

function toWorkDays(settings: Settings): number[] {
  const parsed = normalizeWorkDays(safeParseJson(settings.workDaysJson, DEFAULT_WORK_DAYS));
  return parsed.length ? parsed : DEFAULT_WORK_DAYS;
}

function toVacationDays(settings: Settings): VacationRange[] {
  return sanitizeVacationRanges(safeParseJson(settings.vacationDaysJson, [] as VacationRange[]));
}

export default function SettingsView({ tenant, business, initialSettings }: Props) {
  const [name, setName] = useState(business.name);
  const [email, setEmail] = useState(business.email ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState(business.logoDataUrl ?? "");
  const [slotMinutes, setSlotMinutes] = useState(initialSettings.slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(initialSettings.bufferMinutes);
  const [bookingNotes, setBookingNotes] = useState(initialSettings.bookingNotes ?? "");

  const [workDays, setWorkDays] = useState<number[]>(() => toWorkDays(initialSettings));
  const [hours, setHours] = useState<HoursState>(() => toHoursState(initialSettings));
  const [vacations, setVacations] = useState<VacationRange[]>(() => toVacationDays(initialSettings));

  const [vacationDraft, setVacationDraft] = useState<VacationDraft>({ start: "", end: "", note: "" });

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDraft, setHolidayDraft] = useState<HolidayDraft>({ date: "", reason: "" });
  const [holidayLoading, setHolidayLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = useMemo(() => (tenant ? `?t=${encodeURIComponent(tenant)}` : ""), [tenant]);

  useEffect(() => {
    let ignore = false;
    async function loadHolidays() {
      try {
        setHolidayLoading(true);
        const res = await fetch(`/api/holidays${tenantQuery}`);
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
  }, [tenantQuery]);

  const toggleWorkDay = (day: number) => {
    setWorkDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }

      setHours((prevHours) => {
        if (prevHours[day]?.length) return prevHours;
        return { ...prevHours, [day]: [createDefaultInterval()] };
      });

      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const updateHour = (day: number, index: number, key: keyof TimeRange, value: string) => {
    setHours((prev) => {
      const ranges = [...(prev[day] ?? [])];
      const nextRange = { ...(ranges[index] ?? createDefaultInterval()) };
      nextRange[key] = value;
      ranges[index] = nextRange;
      return { ...prev, [day]: ranges };
    });
  };

  const addInterval = (day: number) => {
    setHours((prev) => {
      const ranges = [...(prev[day] ?? [])];
      ranges.push(createDefaultInterval());
      return { ...prev, [day]: ranges };
    });
  };

  const removeInterval = (day: number, index: number) => {
    setHours((prev) => {
      const ranges = [...(prev[day] ?? [])];
      ranges.splice(index, 1);
      return { ...prev, [day]: ranges };
    });
  };

  const upsertVacation = () => {
    if (!vacationDraft.start) {
      setError("Bitte ein Startdatum für den Ferienzeitraum angeben.");
      return;
    }

    setVacations((prev) => {
      const normalized: VacationRange = {
        start: vacationDraft.start,
        end: vacationDraft.end || undefined,
        note: vacationDraft.note?.trim() || undefined,
      };
      const filtered = prev.filter((entry) => entry.start !== normalized.start);
      return [...filtered, normalized].sort((a, b) => a.start.localeCompare(b.start));
    });
    setVacationDraft({ start: "", end: "", note: "" });
    setError(null);
  };

  const removeVacation = (start: string) => {
    setVacations((prev) => prev.filter((entry) => entry.start !== start));
  };

  const upsertHoliday = async (): Promise<ApiResult<Holiday>> => {
    if (!holidayDraft.date) {
      return { ok: false, message: "Bitte Datum für den Feiertag wählen." };
    }

    try {
      const res = await fetch(`/api/holidays${tenantQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: holidayDraft.date,
          reason: holidayDraft.reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Speichern fehlgeschlagen");
      }
      const created = (await res.json()) as Holiday;
      return { ok: true, data: created };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? String(err) };
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const query = `${tenantQuery}${tenantQuery ? "&" : "?"}id=${encodeURIComponent(id)}`;
      const res = await fetch(`/api/holidays${query}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Feiertag konnte nicht gelöscht werden");
      }
      setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");
    setError(null);

    const body = {
      tenant,
      name: name.trim() || business.name,
      email: email.trim() || null,
      logoDataUrl: logoDataUrl.trim() || null,
      slotMinutes: slotMinutes || 30,
      bufferMinutes: bufferMinutes || 0,
      workDays,
      hours,
      vacationDays: vacations,
      bookingNotes: bookingNotes.trim() || null,
    };

    try {
      const res = await fetch(`/api/settings${tenantQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Speichern fehlgeschlagen");
      }
      setMessage("Einstellungen wurden gespeichert.");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
        <StepHeading
          step={1}
          title="Unternehmensprofil"
          description="Aktualisiere die Stammdaten für deine Kundenkommunikation."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Unternehmensname</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Kontakt E-Mail</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
          </label>
          <label className="sm:col-span-2 grid gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Logo (Data URL)</span>
            <input
              value={logoDataUrl}
              onChange={(event) => setLogoDataUrl(event.target.value)}
              placeholder="data:image/png;base64,..."
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Slot-Länge (Minuten)</span>
            <input
              value={slotMinutes}
              min={5}
              max={240}
              type="number"
              onChange={(event) => setSlotMinutes(Number(event.target.value))}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
          </div>
          <div className="grid gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Puffer (Minuten)</span>
            <input
              value={bufferMinutes}
              min={0}
              max={120}
              type="number"
              onChange={(event) => setBufferMinutes(Number(event.target.value))}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
        <StepHeading
          step={2}
          title="Arbeitszeiten"
          description="Lege fest, an welchen Tagen und zu welchen Zeiten du buchbar bist."
        />
        <div className="mt-6 grid gap-4">
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => {
              const enabled = workDays.includes(day);
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggleWorkDay(day)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                    enabled
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  }`}
                >
                  #{day} {label}
                </button>
              );
            })}
          </div>

          {workDays.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Aktuell sind keine Arbeitstage aktiviert. Kunden können keine Termine buchen.
            </p>
          ) : null}

          {workDays.map((day) => (
            <div key={day} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                #{day} {DAY_LABELS[day]}
              </h3>
              <div className="mt-3 grid gap-3">
                {(hours[day] ?? []).map((range, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">von</span>
                      <input
                        type="time"
                        value={range.from}
                        onChange={(event) => updateHour(day, index, "from", event.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">bis</span>
                      <input
                        type="time"
                        value={range.to}
                        onChange={(event) => updateHour(day, index, "to", event.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeInterval(day, index)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      Slot entfernen
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addInterval(day)}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-blue-400 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-500/70 dark:text-blue-200 dark:hover:bg-blue-500/10"
                >
                  + Zeitfenster hinzufügen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
        <StepHeading
          step={3}
          title="Ferien & Feiertage"
          description="Blockiere Tage, an denen dein Unternehmen geschlossen ist."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Ferienzeiten</h3>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Start *</span>
                  <input
                    type="date"
                    value={vacationDraft.start}
                    onChange={(event) => setVacationDraft((prev) => ({ ...prev, start: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Ende</span>
                  <input
                    type="date"
                    value={vacationDraft.end ?? ""}
                    onChange={(event) => setVacationDraft((prev) => ({ ...prev, end: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </label>
                <label className="grid gap-1 text-sm sm:col-span-1">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Notiz</span>
                  <input
                    type="text"
                    value={vacationDraft.note ?? ""}
                    onChange={(event) => setVacationDraft((prev) => ({ ...prev, note: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={upsertVacation}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Ferienzeit speichern
              </button>
              <ul className="space-y-2 text-sm">
                {vacations.length === 0 ? (
                  <li className="text-neutral-500 dark:text-neutral-400">Keine Ferien hinterlegt.</li>
                ) : (
                  vacations.map((vacation) => (
                    <li
                      key={`${vacation.start}-${vacation.end ?? ""}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                    >
                      <span>
                        #{vacation.start}
                        {vacation.end ? ` – ${vacation.end}` : ""}
                        {vacation.note ? ` · ${vacation.note}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVacation(vacation.start)}
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-300"
                      >
                        Entfernen
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Feiertage</h3>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Datum *</span>
                  <input
                    type="date"
                    value={holidayDraft.date}
                    onChange={(event) => setHolidayDraft((prev) => ({ ...prev, date: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Bezeichnung</span>
                  <input
                    type="text"
                    value={holidayDraft.reason}
                    onChange={(event) => setHolidayDraft((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="z.B. Nationalfeiertag"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const result = await upsertHoliday();
                  if (result.ok) {
                    setHolidays((prev) => [...prev, result.data].sort((a, b) => a.date.localeCompare(b.date)));
                    setHolidayDraft({ date: "", reason: "" });
                    setError(null);
                  } else {
                    setError(result.message);
                  }
                }}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Feiertag hinzufügen
              </button>
              <div className="space-y-2 text-sm">
                {holidayLoading ? (
                  <p className="text-neutral-500 dark:text-neutral-400">Feiertage werden geladen …</p>
                ) : holidays.length === 0 ? (
                  <p className="text-neutral-500 dark:text-neutral-400">Keine Feiertage hinterlegt.</p>
                ) : (
                  holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                    >
                      <span>
                        #{holiday.date}
                        {holiday.reason ? ` · ${holiday.reason}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteHoliday(holiday.id)}
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-300"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
        <StepHeading
          step={4}
          title="Hinweise für Kunden"
          description="Optionaler Text, der auf der Buchungsseite angezeigt wird."
        />
        <textarea
          value={bookingNotes}
          onChange={(event) => setBookingNotes(event.target.value)}
          rows={4}
          className="mt-6 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
        />
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {saving ? "Speichern …" : "Einstellungen sichern"}
        </button>
      </div>
    </div>
  );
}
