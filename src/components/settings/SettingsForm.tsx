"use client";

import { useEffect, useState } from "react";

type WorkingDay = "mo" | "di" | "mi" | "do" | "fr" | "sa" | "so";

type SettingsPayload = {
  companyName: string;
  email: string;
  workingDays: WorkingDay[];
  openFrom: string;
  openTo: string;
};

const ALL_DAYS: WorkingDay[] = ["mo", "di", "mi", "do", "fr", "sa", "so"];
const LABELS: Record<WorkingDay, string> = {
  mo: "Montag",
  di: "Dienstag",
  mi: "Mittwoch",
  do: "Donnerstag",
  fr: "Freitag",
  sa: "Samstag",
  so: "Sonntag",
};

export default function SettingsForm() {
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([
    "mo",
    "di",
    "mi",
    "do",
    "fr"
  ]);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openTo, setOpenTo] = useState("18:00");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const s = (await res.json()) as SettingsPayload | null;
          if (s) {
            setCompanyName(s.companyName ?? "");
            setEmail(s.email ?? "");
            setWorkingDays((s.workingDays as WorkingDay[]) ?? []);
            setOpenFrom(s.openFrom ?? "09:00");
            setOpenTo(s.openTo ?? "18:00");
          }
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  function toggleDay(day: WorkingDay) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function onSave() {
    setSaving(true);
    const payload: SettingsPayload = {
      companyName,
      email,
      workingDays,
      openFrom,
      openTo
    };
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      alert("✅ Gespeichert!");
    } catch (e) {
      console.error(e);
      alert("❌ Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="p-3 text-sm opacity-70">⏳ Lade Einstellungen...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded border px-3 py-2 text-xs">
        <strong>DEBUG:</strong> SettingsForm ist sichtbar
      </div>

      <section className="rounded-xl p-4 shadow border">
        <h2 className="font-medium mb-3">Unternehmen</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Firmenname</label>
            <input
              className="w-full rounded border p-2 bg-transparent"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z. B. Velore"
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
        </div>
      </section>

      <section className="rounded-xl p-4 shadow border">
        <h2 className="font-medium mb-3">Arbeitszeiten</h2>
        <div className="grid gap-4">
          <div>
            <div className="text-sm mb-2">Arbeitstage</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_DAYS.map((d) => (
                <label key={d} className="flex items-center gap-2 rounded border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={workingDays.includes(d)}
                    onChange={() => toggleDay(d)}
                  />
                  <span className="text-sm">{LABELS[d]}</span>
                </label>
              ))}
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

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg px-4 py-2 border shadow disabled:opacity-60"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
