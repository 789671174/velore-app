"use client";

import { Business, Settings } from "@prisma/client";
import { useState } from "react";

type Props = {
  tenant: string;
  business: Business;
  initialSettings: Settings;
};

export default function SettingsView({ tenant, business, initialSettings }: Props) {
  const [slotMinutes, setSlotMinutes] = useState(initialSettings.slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(initialSettings.bufferMinutes);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSave() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          slotMinutes: Number(slotMinutes),
          bufferMinutes: Number(bufferMinutes),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Gespeichert ✅");
    } catch (e: any) {
      setMsg("Fehler: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Einstellungen – {business.name}</h1>
      <p className="text-sm text-neutral-400">Tenant: {tenant}</p>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col">
          <span className="text-sm mb-1">Slot-Minuten</span>
          <input
            className="rounded bg-neutral-800 px-3 py-2"
            type="number"
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            min={5}
            step={5}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm mb-1">Puffer (Minuten)</span>
          <input
            className="rounded bg-neutral-800 px-3 py-2"
            type="number"
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            min={0}
            step={5}
          />
        </label>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2"
      >
        {saving ? "Speichere…" : "Speichern"}
      </button>

      {msg && <div className="text-sm opacity-80">{msg}</div>}

      <pre className="text-xs opacity-60 mt-6">
        {JSON.stringify(initialSettings, null, 2)}
      </pre>
    </div>
  );
}
