"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";

type Props = {
  tenant: string;
  business?: { name?: string };
  initialSettings: {
    slotMinutes?: number;
    bufferMinutes?: number;
    hoursJson?: Record<string, any> | string;
  };
};

// !!! ACHTUNG: Passe den Import zu deiner echten Action an:
async function saveSettings(input: {
  tenant: string;
  slotMinutes: number;
  bufferMinutes: number;
}) {
  // Falls du bereits eine echte Action hast, ersetze das hier
  // z.B. await fetch('/api/settings', { method: 'POST', body: JSON.stringify(input) })
  return Promise.resolve();
}

export default function SettingsView({ tenant, business, initialSettings }: Props) {
  const [slotMinutes, setSlotMinutes] = useState<number>(initialSettings.slotMinutes ?? 30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(initialSettings.bufferMinutes ?? 0);
  const [ok, setOk] = useState<null | "saved" | "error">(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setOk(null);
    startTransition(async () => {
      try {
        await saveSettings({ tenant, slotMinutes, bufferMinutes });
        setOk("saved");
        setTimeout(() => setOk(null), 2000);
      } catch (e) {
        console.error(e);
        setOk("error");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Einstellungen — {tenant.replaceAll("-", " ")}</h1>
      <p className="text-sm opacity-70 mb-8">Tenant: {tenant}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm mb-2">Slot-Minuten</label>
          <input
            type="number"
            min={5}
            step={5}
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Puffer (Minuten)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isPending}
        className={clsx(
          "rounded-md px-4 py-2 font-medium",
          "bg-emerald-600 hover:bg-emerald-500 text-white",
          isPending && "opacity-60 cursor-not-allowed"
        )}
      >
        {isPending ? "Speichern…" : "Speichern"}
      </button>

      {ok === "saved" && (
        <span className="ml-3 text-emerald-400 text-sm">Gespeichert ✓</span>
      )}
      {ok === "error" && (
        <span className="ml-3 text-red-400 text-sm">Fehler beim Speichern</span>
      )}
    </div>
  );
}
