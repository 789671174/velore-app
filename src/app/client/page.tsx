"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "default";

function normalizeTenant(raw: string | null) {
  return (raw ?? "").trim().toLowerCase();
}

function StepHeading({
  step,
  title,
  description,
  isDark,
}: {
  step: number;
  title: string;
  description?: string;
  isDark: boolean;
}) {
  const badgeClass = isDark ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700";
  const titleClass = isDark ? "text-neutral-100" : "text-neutral-900";
  const descriptionClass = isDark ? "text-neutral-400" : "text-neutral-500";

  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold ${badgeClass}`}
      >
        {step}
      </span>
      <div>
        <h2 className={`text-base font-semibold ${titleClass}`}>{title}</h2>
        {description ? <p className={`text-sm ${descriptionClass}`}>{description}</p> : null}
      </div>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: (next: "light" | "dark") => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => onToggle(next)}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-400 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <span aria-hidden>🌓</span>
      <span>{theme === "dark" ? "Helles Design" : "Dunkles Design"}</span>
    </button>
  );
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("de-CH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return date;
  }
}

export default function ClientPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  const [tenant, setTenant] = useState(DEFAULT_TENANT);
  const [companyName, setCompanyName] = useState("Velore");
  const [companyEmail, setCompanyEmail] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState<string | null>(null);

  const [date, setDate] = useState(TODAY);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const slotList = useMemo(() => slots.map((slot, index) => ({ ...slot, index: index + 1 })), [slots]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("velore-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const params = new URLSearchParams(window.location.search);
    const slug = normalizeTenant(params.get("t"));
    if (slug) {
      setTenant(slug);
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

  const settingsQuery = useMemo(() => (tenant ? `?t=${encodeURIComponent(tenant)}` : ""), [tenant]);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const res = await fetch(`/api/settings${settingsQuery}`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as SettingsResponse;
        if (ignore) return;
        setTenant(normalizeTenant(data.tenant) || DEFAULT_TENANT);
        setCompanyName(data.name || "Velore");
        setCompanyEmail(data.email ?? null);
        setCompanyLogo(data.logoDataUrl ?? null);
        setBookingNotes(data.bookingNotes ?? null);
      } catch (error) {
        if (!ignore) {
          console.error("Settings could not be loaded", error);
        }
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, [settingsQuery]);

  const refreshSlots = useCallback(
    async (targetDate: string) => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/slots${settingsQuery}${settingsQuery ? "&" : "?"}date=${targetDate}`);
        if (!res.ok) throw new Error(await res.text());
        const body = await res.json();
        const rawSlots: unknown = body?.slots ?? body;
        const normalized: Slot[] = Array.isArray(rawSlots)
          ? rawSlots.map((entry) =>
              typeof entry === "string"
                ? { time: entry }
                : { time: (entry as Slot).time, disabled: Boolean((entry as Slot).disabled) },
            )
          : [];
        setSlots(normalized);
        if (!normalized.some((slot) => slot.time === selectedTime)) {
          setSelectedTime(null);
        }
      } catch (error: any) {
        console.error("Slots could not be loaded", error);
        setSlots([]);
        setFeedback({
          type: "error",
          message: `Termine konnten nicht geladen werden: ${error?.message ?? error}`,
        });
      } finally {
        setLoadingSlots(false);
      }
    },
    [selectedTime, settingsQuery],
  );

  useEffect(() => {
    refreshSlots(date);
  }, [date, refreshSlots]);

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
      const res = await fetch(`/api/bookings${settingsQuery}`, {
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
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error ?? "Unbekannter Fehler");
      }

      setFeedback({ type: "success", message: "Termin wurde erfolgreich reserviert." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSelectedTime(null);
      refreshSlots(date);
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: `Termin konnte nicht gespeichert werden: ${error?.message ?? error}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 transition-colors duration-200 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-600">Tenant #{tenant}</p>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{companyName}</h1>
            {bookingNotes ? (
              <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{bookingNotes}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            {companyLogo ? <img src={companyLogo} alt="Unternehmenslogo" className="h-12 w-12 rounded-full object-cover" /> : null}
            <ThemeToggle theme={theme} onToggle={setTheme} />
          </div>
        </header>

        <section className="grid gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
          <StepHeading
            step={1}
            title="Datum auswählen"
            description="Wähle zuerst deinen Wunschtag aus."
            isDark={isDark}
          />
          <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="booking-date">
              Datum
            </label>
            <input
              id="booking-date"
              type="date"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
              min={TODAY}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Ausgewählter Tag: {formatDate(date)}</p>
        </section>

        <section className="grid gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
          <StepHeading
            step={2}
            title="Zeitslot wählen"
            description="Die verfügbaren Termine werden automatisch aktualisiert."
            isDark={isDark}
          />
          <div className="flex flex-wrap gap-3">
            {loadingSlots ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Termine werden geladen …</p>
            ) : slotList.length ? (
              slotList.map((slot) => {
                const isActive = slot.time === selectedTime;
                const baseClass =
                  "group relative flex min-w-[120px] items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition";
                const activeClass = isActive
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/80 dark:bg-blue-500/10 dark:text-blue-100"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-blue-400 hover:bg-blue-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-blue-400 dark:hover:bg-blue-500/10";
                const disabledClass = slot.disabled
                  ? "cursor-not-allowed border-dashed opacity-60 hover:border-neutral-300 hover:bg-transparent dark:hover:border-neutral-700"
                  : "cursor-pointer";

                return (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={slot.disabled}
                    onClick={() => {
                      if (!slot.disabled) {
                        setSelectedTime(slot.time);
                        setFeedback(null);
                      }
                    }}
                    className={`${baseClass} ${activeClass} ${disabledClass}`}
                  >
                    <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">#{slot.index}</span>
                    <span>{slot.time} Uhr</span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Keine Termine verfügbar.</p>
            )}
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900">
          <StepHeading
            step={3}
            title="Kontaktdaten eintragen"
            description="Trage deine Daten ein, damit wir dich erreichen können."
            isDark={isDark}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Vorname *</span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Nachname *</span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">E-Mail *</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Telefon</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
              />
            </label>
          </div>
          {feedback ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-500/10 dark:text-red-200"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {companyEmail ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Fragen? Schreibe uns an <a className="text-blue-600 underline" href={`mailto:${companyEmail}`}>{companyEmail}</a>
              </p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {submitting ? "Speichern …" : "Termin bestätigen"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
