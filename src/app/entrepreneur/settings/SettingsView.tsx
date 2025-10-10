"use client";

import { useMemo, useState } from "react";

import type { Holiday, TimeRange, VacationRange } from "@/app/types";

const DAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

const WORKABLE_DAYS = [1, 2, 3, 4, 5, 6];

type BusinessState = {
  id: string;
  slug: string;
  name: string;
  email: string;
  logoDataUrl: string;
};

type SettingsState = {
  slotMinutes: number;
  bufferMinutes: number;
  bookingNotes: string;
  workDays: number[];
  hours: Record<number, TimeRange[]>;
  vacations: VacationRange[];
};

type Props = {
  tenant: string;
  business: BusinessState;
  initialSettings: SettingsState;
  initialHolidays: Holiday[];
};

type VacationDraft = {
  start: string;
  end: string;
  note: string;
};

type HolidayDraft = {
  date: string;
  reason: string;
};

function createDefaultRange(): TimeRange {
  return { from: "09:00", to: "17:00" };
}

function uniqueSortedDays(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export default function SettingsView({
  tenant,
  business,
  initialSettings,
  initialHolidays,
}: Props) {
  const [companyName, setCompanyName] = useState(business.name);
  const [companyEmail, setCompanyEmail] = useState(business.email);
  const [logoDataUrl, setLogoDataUrl] = useState(business.logoDataUrl);

  const [slotMinutes, setSlotMinutes] = useState(initialSettings.slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(initialSettings.bufferMinutes);
  const [bookingNotes, setBookingNotes] = useState(initialSettings.bookingNotes);

  const [workDays, setWorkDays] = useState<number[]>(() => uniqueSortedDays(initialSettings.workDays));
  const [hours, setHours] = useState<Record<number, TimeRange[]>>({ ...initialSettings.hours });

  const [vacations, setVacations] = useState<VacationRange[]>([...initialSettings.vacations]);
  const [vacationDraft, setVacationDraft] = useState<VacationDraft>({ start: "", end: "", note: "" });

  const [holidays, setHolidays] = useState<Holiday[]>([...initialHolidays]);
  const [holidayDraft, setHolidayDraft] = useState<HolidayDraft>({ date: "", reason: "" });
  const [holidayBusy, setHolidayBusy] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = useMemo(() => (tenant ? `?t=${encodeURIComponent(tenant)}` : ""), [tenant]);

  const toggleDay = (day: number) => {
    setWorkDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }
      setHours((current) => {
        if (current[day]?.length) return current;
        return { ...current, [day]: [createDefaultRange()] };
      });
      return uniqueSortedDays([...prev, day]);
    });
  };

  const updateHour = (day: number, index: number, key: keyof TimeRange, value: string) => {
    setHours((prev) => {
      const current = prev[day] ? [...prev[day]] : [createDefaultRange()];
      const target = { ...(current[index] ?? createDefaultRange()) };
      target[key] = value;
      current[index] = target;
      return { ...prev, [day]: current };
    });
  };

  const addHour = (day: number) => {
    setHours((prev) => {
      const list = prev[day] ? [...prev[day]] : [];
      list.push(createDefaultRange());
      return { ...prev, [day]: list };
    });
  };

  const removeHour = (day: number, index: number) => {
    setHours((prev) => {
      const list = prev[day] ? [...prev[day]] : [];
      list.splice(index, 1);
      return { ...prev, [day]: list };
    });
  };

  const upsertVacation = () => {
    if (!vacationDraft.start) {
      setError("Bitte ein Startdatum für Ferien wählen.");
      return;
    }
    const normalized: VacationRange = {
      start: vacationDraft.start,
      end: vacationDraft.end || undefined,
      note: vacationDraft.note ? vacationDraft.note.trim() : undefined,
    };
    setVacations((prev) => {
      const filtered = prev.filter((entry) => entry.start !== normalized.start);
      return [...filtered, normalized].sort((a, b) => a.start.localeCompare(b.start));
    });
    setVacationDraft({ start: "", end: "", note: "" });
    setError(null);
  };

  const removeVacation = (start: string) => {
    setVacations((prev) => prev.filter((entry) => entry.start !== start));
  };

  const createHoliday = async () => {
    if (!holidayDraft.date) {
      setError("Bitte ein Feiertagsdatum wählen.");
      return;
    }
    setHolidayBusy(true);
    setError(null);
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
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Feiertag konnte nicht gespeichert werden.");
      }
      const created = (await res.json()) as Holiday;
      setHolidays((prev) => [...prev.filter((entry) => entry.id !== created.id), created].sort((a, b) => a.date.localeCompare(b.date)));
      setHolidayDraft({ date: "", reason: "" });
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setHolidayBusy(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    setHolidayBusy(true);
    setError(null);
    try {
      const query = `${tenantQuery}${tenantQuery ? "&" : "?"}id=${encodeURIComponent(id)}`;
      const res = await fetch(`/api/holidays${query}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Feiertag konnte nicht gelöscht werden.");
      }
      setHolidays((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setHolidayBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError(null);

    const payload = {
      tenant,
      name: companyName.trim() || business.name,
      email: companyEmail.trim() || null,
      logoDataUrl: logoDataUrl.trim() || null,
      slotMinutes: Number(slotMinutes) || 30,
      bufferMinutes: Number(bufferMinutes) || 0,
      workDays,
      hours,
      vacationDays: vacations,
      bookingNotes: bookingNotes.trim() || null,
    };

    try {
      const res = await fetch(`/api/settings${tenantQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Einstellungen konnten nicht gespeichert werden.");
      }
      setMessage("Einstellungen gespeichert.");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Unternehmenseinstellungen</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Tenant: {tenant}</p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Unternehmensprofil</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">E-Mail</span>
            <input
              type="email"
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={companyEmail}
              onChange={(event) => setCompanyEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Logo (Data URL)</span>
            <input
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={logoDataUrl}
              onChange={(event) => setLogoDataUrl(event.target.value)}
              placeholder="data:image/png;base64,..."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Slot-Minuten</span>
            <input
              type="number"
              min={5}
              step={5}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={slotMinutes}
              onChange={(event) => setSlotMinutes(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Puffer (Minuten)</span>
            <input
              type="number"
              min={0}
              step={5}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={bufferMinutes}
              onChange={(event) => setBufferMinutes(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Hinweise für Buchungen</span>
            <textarea
              className="min-h-[96px] rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              value={bookingNotes}
              onChange={(event) => setBookingNotes(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Arbeitstage &amp; Zeiten</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {WORKABLE_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                workDays.includes(day)
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>

        {workDays.map((day) => (
          <div key={day} className="mt-4 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{DAY_LABELS[day]}</h3>
            <div className="mt-3 flex flex-col gap-3">
              {(hours[day] && hours[day].length ? hours[day] : [createDefaultRange()]).map((range, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={range.from}
                    onChange={(event) => updateHour(day, index, "from", event.target.value)}
                    className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                  <span className="text-sm text-neutral-500">bis</span>
                  <input
                    type="time"
                    value={range.to}
                    onChange={(event) => updateHour(day, index, "to", event.target.value)}
                    className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeHour(day, index)}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addHour(day)}
                className="self-start rounded border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Zeitfenster hinzufügen
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Ferien</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Von</span>
            <input
              type="date"
              value={vacationDraft.start}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, start: event.target.value }))}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Bis</span>
            <input
              type="date"
              value={vacationDraft.end}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, end: event.target.value }))}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Notiz</span>
            <input
              value={vacationDraft.note}
              onChange={(event) => setVacationDraft((prev) => ({ ...prev, note: event.target.value }))}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <button
            type="button"
            onClick={upsertVacation}
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Zeitraum speichern
          </button>
        </div>
        {vacations.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {vacations.map((vacation) => (
              <li key={vacation.start} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">
                    {vacation.start}
                    {vacation.end ? ` – ${vacation.end}` : null}
                  </div>
                  {vacation.note ? <div className="text-xs text-neutral-500 dark:text-neutral-400">{vacation.note}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeVacation(vacation.start)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Keine Ferien hinterlegt.</p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Feiertage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Datum</span>
            <input
              type="date"
              value={holidayDraft.date}
              onChange={(event) => setHolidayDraft((prev) => ({ ...prev, date: event.target.value }))}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Grund</span>
            <input
              value={holidayDraft.reason}
              onChange={(event) => setHolidayDraft((prev) => ({ ...prev, reason: event.target.value }))}
              className="rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <button
            type="button"
            disabled={holidayBusy}
            onClick={createHoliday}
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Feiertag hinzufügen
          </button>
        </div>
        {holidays.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {holidays.map((holiday) => (
              <li key={holiday.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{holiday.date}</div>
                  {holiday.reason ? <div className="text-xs text-neutral-500 dark:text-neutral-400">{holiday.reason}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => deleteHoliday(holiday.id)}
                  className="text-xs text-red-500 hover:text-red-600"
                  disabled={holidayBusy}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Keine Feiertage vorhanden.</p>
        )}
      </section>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-600">{message}</div> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
