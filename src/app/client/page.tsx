"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = {
  time: string;
  disabled?: boolean;
};

type SettingsResponse = {
  tenant: string;
  name?: string;
  email?: string | null;
  logoDataUrl?: string | null;
  bookingNotes?: string | null;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function ClientPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  const [date, setDate] = useState(TODAY);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [companyName, setCompanyName] = useState("Velora");
  const [companyEmail, setCompanyEmail] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("velore-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("velore-theme", theme);
    }
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.style.colorScheme = "";
    };
  }, [theme]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as SettingsResponse;
        setCompanyName(data.name || "Velora");
        setCompanyEmail(data.email ?? null);
        setCompanyLogo(data.logoDataUrl ?? null);
        setBookingNotes(data.bookingNotes ?? null);
      } catch (err) {
        console.error("Settings could not be loaded", err);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    refreshSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const refreshSlots = async (nextDate: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/slots?date=${nextDate}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const rawSlots: unknown = data?.slots ?? data;
      const normalized: Slot[] = Array.isArray(rawSlots)
        ? rawSlots.map((entry) =>
            typeof entry === "string"
              ? { time: entry }
              : { time: (entry as Slot).time, disabled: (entry as Slot).disabled },
          )
        : [];
      setSlots(normalized);
      if (normalized.every((slot) => slot.time !== selectedTime)) {
        setSelectedTime(null);
      }
    } catch (err: any) {
      console.error("Slots could not be loaded", err);
      setFeedback({ type: "error", message: `Termine konnten nicht geladen werden: ${err?.message ?? err}` });
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const submit = async () => {
    if (!selectedTime) {
      setFeedback({ type: "error", message: "Bitte eine Uhrzeit auswählen." });
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFeedback({ type: "error", message: "Bitte alle Pflichtfelder ausfüllen." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          date,
          time: selectedTime,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const booking = await res.json();
      setFeedback({ type: "success", message: `Termin angefragt! Referenz: ${booking.id}` });
      setSelectedTime(null);
      refreshSlots(date);
    } catch (err: any) {
      setFeedback({ type: "error", message: `Die Anfrage konnte nicht gesendet werden: ${err?.message ?? err}` });
    } finally {
      setSubmitting(false);
    }
  };

  const containerClass = useMemo(() => {
    const base = "theme-container min-h-screen transition-colors";
    return isDark ? `${base} bg-[#0b1220] text-neutral-100` : `${base} bg-neutral-50 text-neutral-900`;
  }, [isDark]);

  const panelClass = useMemo(
    () =>
      isDark
        ? "rounded-2xl border border-neutral-700 bg-[#111a2e] shadow-2xl shadow-black/40"
        : "rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-black/10",
    [isDark],
  );

  const inputClass = useMemo(
    () =>
      `w-full rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
        isDark
          ? "bg-[#0f172a] border border-neutral-700 text-neutral-100 placeholder-neutral-400 focus:ring-blue-400"
          : "bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:ring-blue-500 focus:ring-offset-1"
      }`,
    [isDark],
  );

  const slotButtonClass = (slot: Slot) => {
    const base = `rounded-xl border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
      slot.disabled ? "cursor-not-allowed opacity-40" : ""
    }`;
    const active = selectedTime === slot.time;
    if (isDark) {
      return `${base} ${
        active
          ? "border-blue-400 text-blue-200 ring-blue-300"
          : "border-neutral-700 text-neutral-200 hover:border-blue-400 hover:text-blue-200"
      }`;
    }
    return `${base} ${
      active
        ? "border-blue-500 text-blue-600 ring-blue-300"
        : "border-neutral-300 text-neutral-700 hover:border-blue-500 hover:text-blue-600"
    }`;
  };

  return (
    <div className={containerClass}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogo} alt="Logo" className="h-12 w-12 rounded-xl border border-white/20 object-cover" />
            ) : (
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-sm ${
                  isDark ? "border-neutral-700 text-neutral-400" : "border-neutral-200 text-neutral-500"
                }`}
              >
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold">{companyName} – Termin buchen</h1>
              {bookingNotes && <p className="text-sm text-neutral-400">{bookingNotes}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isDark
                ? "border-neutral-700 bg-[#111a2e] text-neutral-200 hover:border-blue-400"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-blue-500"
            }`}
            aria-pressed={isDark}
          >
            {isDark ? "Helles Design" : "Dunkles Design"}
          </button>
        </header>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? isDark
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isDark
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className={`${panelClass} p-6`}> 
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Vorname</label>
              <input
                className={inputClass}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Max"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nachname</label>
              <input
                className={inputClass}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Mustermann"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">E-Mail</label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="max@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Telefon (optional)</label>
              <input
                className={inputClass}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+41 44 123 45 67"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Datum</label>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                style={{ colorScheme: theme }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Uhrzeit auswählen</label>
              {loadingSlots ? (
                <p className="mt-2 text-sm text-neutral-400">Slots werden geladen…</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {slots.length === 0 && (
                    <p className="col-span-4 text-sm text-neutral-400">Keine Slots verfügbar.</p>
                  )}
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.disabled}
                      onClick={() => setSelectedTime(slot.time)}
                      className={slotButtonClass(slot)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isDark
                  ? "bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/60"
                  : "bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-400/60"
              }`}
            >
              {submitting ? "Wird gesendet…" : "Termin anfragen"}
            </button>
          </div>
        </div>

        <footer className="space-y-2 text-sm text-neutral-500">
          <p>Wir melden uns schnellstmöglich mit einer Bestätigung.</p>
          {companyEmail && (
            <p>
              Rückfragen an <a className="font-medium text-blue-500" href={`mailto:${companyEmail}`}>{companyEmail}</a>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
