"use client";

import { useEffect, useMemo, useState } from "react";

type WorkingDay = "mo" | "di" | "mi" | "do" | "fr" | "sa" | "so";

const dayLabels: Record<WorkingDay, string> = {
  mo: "Montag",
  di: "Dienstag",
  mi: "Mittwoch",
  do: "Donnerstag",
  fr: "Freitag",
  sa: "Samstag",
  so: "Sonntag",
};

type SettingsPayload = {
  tenant?: string | null; // optionaler Mandant/Slug
  companyName: string;
  email: string;
  workingDays: WorkingDay[];
  openFrom: string;
  openTo: string;
  vacationRange: { start: string | null; end: string | null };
  holidays: string[];
  logo: string | null; // base64 data URL
};

export default function SettingsForm() {
  const [tenant, setTenant] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([
    "mo",
    "di",
    "mi",
    "do",
    "fr",
  ]);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openTo, setOpenTo] = useState("18:00");

  const [vacationStart, setVacationStart] = useState<string>("");
  const [vacationEnd, setVacationEnd] = useState<string>("");
  const [holidays, setHolidays] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const logoHint = useMemo(
    () => (logoFile ? `${Math.round(logoFile.size / 1024)} KB` : "PNG/JPG"),
    [logoFile]
  );

  function toggleDay(d: WorkingDay) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setLogoFile(f || null);
    if (!f) return setLogoPreview(null);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(f);
  }

  // Initialdaten laden (Server → KV), Fallback: localStorage
  useEffect(() => {
    const urlTenant =
      new URLSearchParams(window.location.search).get("t") ?? null;
    setTenant(urlTenant);

    (async () => {
      try {
        const res = await fetch(
          `/api/settings${urlTenant ? `?tenant=${encodeURIComponent(urlTenant)}` : ""}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const s = (await res.json()) as SettingsPayload | null;
          if (s) {
            setCompanyName(s.companyName ?? "");
            setEmail(s.email ?? "");
            setWorkingDays((s.workingDays as WorkingDay[]) ?? workingDays);
            setOpenFrom(s.openFrom ?? "09:00");
            setOpenTo(s.openTo ?? "18:00");
            setVacationStart(s.vacationRange?.start ?? "");
            setVacationEnd(s.vacationRange?.end ?? "");
            setHolidays(s.holidays?.join(", ") ?? "");
            setLogoPreview(s.logo ?? null);
            setLoaded(true);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Fallback localStorage
      const raw = localStorage.getItem("velora.settings");
      if (raw) {
        try {
          const s = JSON.parse(raw);
          setCompanyName(s.companyName ?? "");
          setEmail(s.email ?? "");
          setWorkingDays(s.workingDays ?? workingDays);
          setOpenFrom(s.openFrom ?? "09:00");
          setOpenTo(s.openTo ?? "18:00");
          setVacationStart(s.vacationRange?.start ?? "");
          setVacationEnd(s.vacationRange?.end ?? "");
          setHolidays(s.holidays?.join(", ") ?? "");
          setLogoPreview(s.logo ?? null);
        } catch {}
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    const payload: SettingsPayload = {
      tenant,
      companyName,
      email,
      workingDays,
      openFrom,
      openTo,
      vacationRange: {
        start: vacationStart || null,
        end: vacationEnd || null,
      },
      holidays: holidays
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      logo: logoPreview ?? null,
    };

    // lokal zwischenspeichern
    localStorage.setItem("velora.settings", JSON.stringify(payload));

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Gespeichert.");
    } catch (e: any) {
      alert("Konnte nicht auf dem Server speichern. Lokal gesichert.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="opacity-70">Lade Einstellungen…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Unternehmensdaten */}
      <section className="rounded-2xl p-4 shadow border">
        <h2 className="font-medium mb-3">Unternehmen</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full rounded border p-2 bg-transparent"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z. B. Velora Hairstyles"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">E-Mail</label>
            <input
              className="w-full rounded border p-2 bg-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="studio@beispiel.ch"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Logo (optional)</label>
            <div className="flex items-center gap-4">
              <input type="file" accept="image/*" onChange={onFile} />
              <span className="text-xs opacity-70">{logoHint}</span>
            </div>
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="mt-3 h-16 w-16 rounded object-contain border"
              />
            )}
          </div>
        </div>
      </section>

      {/* Arbeitszeiten */}
      <section className="rounded-2xl p-4 shadow border">
        <h2 className="font-medium mb-3">Arbeitszeiten</h2>
        <div className="grid gap-4">
          <div>
            <div className="text-sm mb-2">Arbeitstage</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["mo", "di", "mi", "do", "fr", "sa", "so"] as WorkingDay[]).map(
                (d) => (
                  <label
                    key={d}
                    className="flex items-center gap-2 rounded border px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={workingDays.includes(d)}
                      onChange={() => toggleDay(d)}
                    />
                    <span className="text-sm">{dayLabels[d]}</span>
                  </label>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-sm mb-1">Öffnet um</label>
              <input
                type="time"
                value={openFrom}
                onChange={(e) => setOpenFrom(e.target.value)}
                className="rounded border p-2 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Schließt um</label>
              <input
                type="time"
                value={openTo}
                onChange={(e) => setOpenTo(e.target.value)}
                className="rounded border p-2 bg-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ferien & Feiertage */}
      <section className="rounded-2xl p-4 shadow border">
        <h2 className="font-medium mb-3">Ferien & Feiertage</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Ferien: Start</label>
            <input
              type="date"
              value={vacationStart}
              onChange={(e) => setVacationStart(e.target.value)}
              className="w-full rounded border p-2 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Ferien: Ende</label>
            <input
              type="date"
              value={vacationEnd}
              onChange={(e) => setVacationEnd(e.target.value)}
              className="w-full rounded border p-2 bg-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">
              Feiertage (YYYY-MM-DD, mit Komma trennen)
            </label>
            <input
              className="w-full rounded border p-2 bg-transparent"
              value={holidays}
              onChange={(e) => setHolidays(e.target.value)}
              placeholder="2025-01-01, 2025-04-18, 2025-12-25"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
