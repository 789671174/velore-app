"use client";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { Booking, Holiday, BusinessSettings, DayHours } from "@/app/types";

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const isWeekend = (d: Date) => [0, 6].includes(d.getDay());
function getMonthMatrix(y: number, m: number) {
  const f = new Date(y, m, 1);
  const s = (f.getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let c = 1 - s;
  for (let r = 0; r < 6; r++) {
    const row: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(y, m, c);
      row.push(c < 1 || c > dim ? null : dt);
      c++;
    }
    weeks.push(row);
  }
  return weeks;
}

export default function EntrepreneurPage() {
  const now = new Date();
  const [dark, setDark] = useState(true);
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedISO, setSelectedISO] = useState<string>(toISO(now));
  const [showSettings, setShowSettings] = useState(false);

  // Settings kommen aus der DB. hoursJson ist dort ein STRING.
  // Im UI arbeiten wir mit einem OBJEKT (geparst).
  const [settings, setSettings] = useState<any | null>(null);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");

  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);

  async function loadAll() {
    const [bRes, hRes, sRes] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/holidays"),
      fetch("/api/settings"),
    ]);
    setBookings(await bRes.json());
    setHolidays(await hRes.json());
    const s = await sRes.json();
    setSettings({
      ...s,
      hoursJson:
        typeof s.hoursJson === "string"
          ? JSON.parse(s.hoursJson || "{}")
          : s.hoursJson || {},
    });
  }
  useEffect(() => {
    loadAll();
  }, []);

  const pending = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings]
  );
  const accepted = useMemo(
    () => bookings.filter((b) => b.status === "accepted"),
    [bookings]
  );
  const isHoliday = (iso: string) => holidays.some((h) => h.date === iso);
  const monthName = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
  const dayList = useMemo(
    () => bookings.filter((b) => b.date === selectedISO),
    [bookings, selectedISO]
  );
  const dayPending = dayList.filter((b) => b.status === "pending").length;
  const dayAccepted = dayList.filter((b) => b.status === "accepted").length;

  const handleStatus = async (id: string, status: Booking["status"]) => {
    const res = await fetch(`/api/bookings?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBookings((p) => p.map((b) => (b.id === id ? updated : b)));
    }
  };

  const panel = dark
    ? "bg-[#0f172a] border-[#1f2937]"
    : "bg-white border-neutral-200";

  // Öffnungszeiten im UI verändern (settings.hoursJson ist ein Objekt!)
  const updateHours = (
    day: keyof BusinessSettings["hours"],
    patch: Partial<DayHours>
  ) => {
    if (!settings) return;
    const hours = { ...(settings.hoursJson || {}) };
    const current = hours[day] || { open: false, start: "09:00", end: "18:00" };
    hours[day] = { ...current, ...patch };
    setSettings({ ...settings, hoursJson: hours });
  };

  const onLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      if (settings) setSettings({ ...settings, logoDataUrl: undefined });
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      if (settings) setSettings({ ...settings, logoDataUrl: String(r.result) });
    };
    r.readAsDataURL(f);
  };

  const saveSettings = async () => {
    if (!settings) return;
    const body = {
      name: settings.name,
      logoDataUrl: settings.logoDataUrl,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      slotMinutes: settings.slotMinutes,
      bufferMinutes: settings.bufferMinutes,
      // WICHTIG: Beim Speichern als String hochsenden
      hours: JSON.stringify(settings.hoursJson),
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) alert("Einstellungen gespeichert.");
  };

  const addHoliday = async () => {
    if (!newHolidayDate) return;
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newHolidayDate, reason: newHolidayReason || undefined }),
    });
    if (res.ok) {
      const h = await res.json();
      setHolidays((x) => [...x, h]);
      setNewHolidayDate("");
      setNewHolidayReason("");
    }
  };
  const removeHoliday = async (id: string) => {
    const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
    if (res.ok) setHolidays((x) => x.filter((h) => h.id !== id));
  };

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[#0b1220] text-neutral-100"
          : "min-h-screen bg-neutral-50 text-neutral-900"
      }
    >
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {settings?.logoDataUrl ? (
              <img src={settings.logoDataUrl} className="w-8 h-8 rounded" />
            ) : (
              <div className="w-8 h-8 rounded bg-white/10 border border-white/10" />
            )}
            <div className="text-lg font-bold">
              {settings?.name || "Velora CRM"}{" "}
              <span className="opacity-60 text-sm">v1.0.0</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="rounded-xl border border-white/10 bg-emerald-600/40 px-3 py-1"
            >
              Speichern
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1"
            >
              {showSettings ? "Kalender" : "Einstellungen"}
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1"
            >
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        {!showSettings && (
          <>
            {/* Kalender */}
            <div className={`rounded-2xl p-4 border shadow-sm ${panel}`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMonth((m) => (m === 0 ? 11 : m - 1))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1"
                >
                  ‹
                </button>
                <h2 className="font-semibold">{monthName}</h2>
                <button
                  onClick={() => setMonth((m) => (m === 11 ? 0 : m + 1))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1"
                >
                  ›
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2 text-xs opacity-80">
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-3">
                {matrix.flatMap((week, wi) =>
                  week.map((day, di) => {
                    if (!day)
                      return (
                        <div
                          key={`e-${wi}-${di}`}
                          className="h-28 rounded-2xl border border-white/5 bg-transparent"
                        />
                      );
                    const iso = toISO(day);
                    const list = bookings.filter((b) => b.date === iso);
                    const p = list.filter((b) => b.status === "pending").length;
                    const a = list.filter((b) => b.status === "accepted").length;
                    const weekend = isWeekend(day);
                    const holiday = isHoliday(iso);
                    const isSel = selectedISO === iso;
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelectedISO(iso)}
                        className={`relative h-28 rounded-2xl border text-left p-2 transition border-white/10 bg-white/0 hover:bg-white/5 ${
                          weekend ? "bg-[#3b0f0f]/60 border-[#7f1d1d]" : ""
                        } ${holiday ? "bg-[#3b3f0f]/60 border-[#7f7d1d]" : ""} ${
                          isSel
                            ? dark
                              ? "bg-white text-[#0b1220]"
                              : "bg-neutral-900 text-white"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-base">
                            {day.getDate()}
                          </span>
                          {holiday && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 bg-white/10">
                              Feiertag
                            </span>
                          )}
                        </div>
                        <div className="absolute left-2 bottom-2 flex flex-col gap-1">
                          {a > 0 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600/40 border border-emerald-400/40">
                              fix {a}
                            </span>
                          )}
                          {p > 0 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-600/40 border border-amber-400/40">
                              ausst. {p}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tagesliste */}
            <div className={`mt-6 rounded-2xl p-4 border shadow-sm ${panel}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                  Termine am {new Date(selectedISO).toLocaleDateString("de-CH")}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600/40 border border-emerald-400/40">
                    fix {dayAccepted}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-600/40 border border-amber-400/40">
                    ausst. {dayPending}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                    gesamt {dayAccepted + dayPending}
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {dayList.length === 0 ? (
                  <p className="text-sm opacity-80">Noch keine Termine.</p>
                ) : (
                  dayList.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {b.time} – {b.firstName} {b.lastName}
                        </div>
                        <div className="text-xs opacity-70">
                          {b.email}
                          {b.phone ? ` · ${b.phone}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {b.status !== "accepted" && (
                          <button
                            onClick={() => handleStatus(b.id, "accepted")}
                            className="rounded-lg border border-white/10 bg-emerald-600/40 px-3 py-1 text-sm"
                          >
                            fix
                          </button>
                        )}
                        {b.status !== "declined" && (
                          <button
                            onClick={() => handleStatus(b.id, "declined")}
                            className="rounded-lg border border-white/10 bg-amber-600/40 px-3 py-1 text-sm"
                          >
                            ablehnen
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Einstellungen */}
        {showSettings && settings && (
          <div className={`rounded-2xl p-5 border shadow-sm space-y-8 ${panel}`}>
            <section>
              <h2 className="font-semibold mb-3">Unternehmensprofil</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm">Unternehmensname</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    value={settings.name || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, name: e.target.value })
                    }
                    placeholder="Salon Velora"
                  />
                </div>
                <div>
                  <label className="text-sm">Logo</label>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="w-12 h-12 rounded border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                      {settings.logoDataUrl ? (
                        <img
                          src={settings.logoDataUrl}
                          className="max-w-full max-h-full"
                        />
                      ) : (
                        <span className="text-xs opacity-60">kein Logo</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onLogoChange}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm">Telefon</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={settings.phone || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">E-Mail</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={settings.email || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm">Webseite</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={settings.website || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, website: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-sm">Adresse</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={settings.address || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-3">Öffnungszeiten & Slots</h2>
              <div className="grid grid-cols-1 gap-2">
                {(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const).map(
                  (day) => {
                    const d =
                      (settings.hoursJson || {})[day] || {
                        open: false,
                        start: "09:00",
                        end: "18:00",
                      };
                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 grid grid-cols-12 items-center gap-2"
                      >
                        <div className="col-span-2 md:col-span-1 font-medium">
                          {day}
                        </div>
                        <label className="col-span-3 md:col-span-2 inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!d.open}
                            onChange={(e) =>
                              updateHours(day, { open: e.target.checked })
                            }
                          />
                          geöffnet
                        </label>
                        <div className="col-span-3 md:col-span-3">
                          <label className="text-xs opacity-80">von</label>
                          <input
                            type="time"
                            disabled={!d.open}
                            value={d.start}
                            onChange={(e) =>
                              updateHours(day, { start: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-3">
                          <label className="text-xs opacity-80">bis</label>
                          <input
                            type="time"
                            disabled={!d.open}
                            value={d.end}
                            onChange={(e) =>
                              updateHours(day, { end: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1"
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm">Slotdauer (Minuten)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    value={settings.slotMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        slotMinutes: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Puffer (Minuten)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    value={settings.bufferMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bufferMinutes: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-3">Feiertage/Abwesenheiten</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm">Datum</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    value={newHolidayDate}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm">Grund (optional)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    placeholder="Feiertag, Ferien, Arzttermin…"
                    onChange={(e) => setNewHolidayReason(e.target.value)}
                    value={newHolidayReason}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs opacity-70">
                  An diesen Tagen sind keine Buchungen möglich.
                </p>
                <button
                  onClick={addHoliday}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  Feiertag hinzufügen
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {holidays.length === 0 ? (
                  <p className="text-sm opacity-80">Keine Feiertage hinterlegt.</p>
                ) : (
                  holidays.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{h.date}</div>
                        {h.reason && (
                          <div className="text-xs opacity-70">{h.reason}</div>
                        )}
                      </div>
                      <button
                        onClick={() => removeHoliday(h.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="flex items-center justify-end">
              <button
                onClick={saveSettings}
                className="rounded-xl border border-white/10 bg-emerald-600/40 px-4 py-2"
              >
                Alle Einstellungen speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
