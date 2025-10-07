param()

function Ensure-Dir($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

# 1) Prisma: holidaysJson ins Modell einfügen, falls nicht vorhanden
$schemaPath = "prisma/schema.prisma"
if (Test-Path $schemaPath) {
  $schema = Get-Content $schemaPath -Raw
  if ($schema -match "model\s+BusinessSettings\s*{") {
    if ($schema -notmatch "holidaysJson") {
      # versuche, nach der Zeile mit hoursJson einzufügen
      $schema = $schema -replace "(hoursJson\s+String[^\r\n]*\r?\n)","`$1  holidaysJson String @default(""{}"")`r`n"
      Set-Content -Path $schemaPath -Value $schema -Encoding UTF8
    }
  }
}

# 2) Settings Page
$settingsDir = "src/app/(dashboard)/settings"
Ensure-Dir $settingsDir
$pageTsx = @"
"use client";

import { useEffect, useMemo, useState } from "react";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayConfig = { closed: boolean; ranges: { from: string; to: string }[] };
type HoursJson = Record<DayKey, DayConfig>;
type Holiday = { date: string; label: string };
type HolidaysJson = { items: Holiday[] };

type Settings = {
  id: string;
  businessId: string;
  slotMinutes: number;
  bufferMinutes: number;
  hoursJson: string;
  holidaysJson?: string;
};

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Montag", tue: "Dienstag", wed: "Mittwoch",
  thu: "Donnerstag", fri: "Freitag", sat: "Samstag", sun: "Sonntag",
};

const DEFAULT_HOURS: HoursJson = {
  mon: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
  tue: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
  wed: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
  thu: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
  fri: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
  sat: { closed: true, ranges: [] },
  sun: { closed: true, ranges: [] },
};

const emptyHolidays: HolidaysJson = { items: [] };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [raw, setRaw] = useState<Settings | null>(null);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [hours, setHours] = useState<HoursJson>(DEFAULT_HOURS);
  const [holidays, setHolidays] = useState<HolidaysJson>(emptyHolidays);

  const tenantFromPath = useMemo(() => {
    if (typeof window === "undefined") return "";
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tIndex = parts.indexOf("t");
    if (tIndex >= 0 && parts[tIndex + 1]) return parts[tIndex + 1];
    return "";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/settings", { method: "GET" });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = (await res.json()) as Settings;

        setRaw(data);
        setSlotMinutes(data.slotMinutes ?? 30);
        setBufferMinutes(data.bufferMinutes ?? 0);

        try {
          const parsed = JSON.parse(data.hoursJson || "{}");
          setHours({ ...DEFAULT_HOURS, ...parsed });
        } catch { setHours(DEFAULT_HOURS); }

        try {
          const parsedH = data.holidaysJson ? JSON.parse(data.holidaysJson) : emptyHolidays;
          setHolidays({ items: Array.isArray(parsedH?.items) ? parsedH.items : [] });
        } catch { setHolidays(emptyHolidays); }
      } catch (e:any) {
        setError(e.message || "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateDay = (day: DayKey, updater: (d: DayConfig) => DayConfig) =>
    setHours((prev) => ({ ...prev, [day]: updater(prev[day] ?? { closed: true, ranges: [] }) }));

  const addRange = (day: DayKey) => updateDay(day, (d) => ({ ...d, closed: false, ranges: [...d.ranges, { from: "09:00", to: "12:00" }] }));
  const removeRange = (day: DayKey, idx: number) => updateDay(day, (d) => ({ ...d, ranges: d.ranges.filter((_, i) => i!==idx) }));
  const setRange = (day: DayKey, idx: number, key: "from"|"to", val: string) =>
    updateDay(day, (d) => ({ ...d, ranges: d.ranges.map((r,i)=> i===idx? { ...r, [key]: val } : r) }));
  const toggleClosed = (day: DayKey, closed: boolean) =>
    updateDay(day, (d) => ({ ...d, closed, ranges: closed ? [] : d.ranges.length? d.ranges : [{ from: "09:00", to: "18:00" }]}));

  const addHoliday = () => setHolidays((h) => ({ items: [...h.items, { date: new Date().toISOString().slice(0,10), label: "Feiertag" }] }));
  const removeHoliday = (idx: number) => setHolidays((h) => ({ items: h.items.filter((_, i) => i !== idx) }));
  const setHoliday = (idx: number, key: "date" | "label", val: string) =>
    setHolidays((h) => ({ items: h.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)) }));

  const onSave = async () => {
    setSaving(true); setError(null);
    try {
      const body = {
        slotMinutes, bufferMinutes,
        hoursJson: JSON.stringify(hours),
        holidaysJson: JSON.stringify(holidays),
      };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Konnte nicht speichern");
    } catch (e:any) {
      setError(e.message || "Fehler beim Speichern");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6">Lade Einstellungen…</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Einstellungen – {tenantFromPath || "Salon"}</h1>
      <p className="text-sm opacity-70 mb-6">Tenant: {tenantFromPath || "–"}</p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <label className="flex flex-col gap-2">
          <span>Slot-Minuten</span>
          <input type="number" min={5} step={5} value={slotMinutes}
            onChange={(e)=>setSlotMinutes(parseInt(e.target.value||"0"))}
            className="px-3 py-2 rounded bg-neutral-800 text-white"/>
        </label>

        <label className="flex flex-col gap-2">
          <span>Puffer (Minuten)</span>
          <input type="number" min={0} step={5} value={bufferMinutes}
            onChange={(e)=>setBufferMinutes(parseInt(e.target.value||"0"))}
            className="px-3 py-2 rounded bg-neutral-800 text-white"/>
        </label>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Öffnungszeiten</h2>
        <div className="space-y-4">
          {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
            const cfg = hours[day] ?? { closed: true, ranges: [] };
            return (
              <div key={day} className="rounded-lg p-4 border border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{DAY_LABELS[day]}</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cfg.closed} onChange={(e)=>toggleClosed(day, e.target.checked)} />
                    <span>Geschlossen</span>
                  </label>
                </div>

                {!cfg.closed && (
                  <div className="mt-3 space-y-2">
                    {cfg.ranges.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-70">von</span>
                          <input type="time" value={r.from}
                            onChange={(e)=>setRange(day, idx, "from", e.target.value)}
                            className="px-2 py-1 rounded bg-neutral-800 text-white"/>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-70">bis</span>
                          <input type="time" value={r.to}
                            onChange={(e)=>setRange(day, idx, "to", e.target.value)}
                            className="px-2 py-1 rounded bg-neutral-800 text-white"/>
                        </div>
                        <button onClick={()=>removeRange(day, idx)}
                          className="px-2 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Entfernen</button>
                      </div>
                    ))}
                    <button onClick={()=>addRange(day)}
                      className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Zeitspanne hinzufügen</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Feiertage / Schließtage</h2>
        <div className="space-y-3">
          {holidays.items.map((h, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input type="date" value={h.date}
                onChange={(e)=>setHoliday(idx,"date",e.target.value)}
                className="px-2 py-1 rounded bg-neutral-800 text-white"/>
              <input type="text" placeholder="Bezeichnung"
                value={h.label}
                onChange={(e)=>setHoliday(idx,"label",e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-neutral-800 text-white"/>
              <button onClick={()=>removeHoliday(idx)}
                className="px-2 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Entfernen</button>
            </div>
          ))}
          <button onClick={()=>addHoliday()}
            className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Feiertag hinzufügen</button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-400">{error}</div>}

      <button onClick={onSave} disabled={saving}
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">
        {saving ? "Speichere…" : "Speichern"}
      </button>

      <pre className="mt-6 text-xs opacity-70 whitespace-pre-wrap">
{JSON.stringify(
  { id: raw?.id, businessId: raw?.businessId, slotMinutes, bufferMinutes, hoursJson: hours, holidaysJson: holidays },
  null, 2
)}
      </pre>
    </div>
  );
}
"@
Set-Content -Path "$settingsDir/page.tsx" -Value $pageTsx -Encoding UTF8

# 3) API Route
$apiDir = "src/app/api/settings"
Ensure-Dir $apiDir
$routeTs = @"
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function getOrCreateSettings() {
  let s = await prisma.businessSettings.findFirst();
  if (!s) {
    s = await prisma.businessSettings.create({
      data: {
        slotMinutes: 30,
        bufferMinutes: 0,
        hoursJson: JSON.stringify({
          mon: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
          tue: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
          wed: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
          thu: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
          fri: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
          sat: { closed: true,  ranges: [] },
          sun: { closed: true,  ranges: [] },
        }),
        holidaysJson: JSON.stringify({ items: [] }),
      },
    });
  }
  return s;
}

export async function GET() {
  const s = await getOrCreateSettings();
  return NextResponse.json(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slotMinutes, bufferMinutes, hoursJson, holidaysJson } = body ?? {};
  const slot = Math.max(5, Math.min(240, Number(slotMinutes) || 30));
  const buffer = Math.max(0, Math.min(240, Number(bufferMinutes) || 0));
  const current = await getOrCreateSettings();

  const updated = await prisma.businessSettings.update({
    where: { id: current.id },
    data: {
      slotMinutes: slot,
      bufferMinutes: buffer,
      hoursJson: typeof hoursJson === "string" ? hoursJson : JSON.stringify(hoursJson ?? {}),
      holidaysJson: typeof holidaysJson === "string" ? holidaysJson : JSON.stringify(holidaysJson ?? { items: [] }),
    },
  });

  return NextResponse.json(updated);
}
"@
Set-Content -Path "$apiDir/route.ts" -Value $routeTs -Encoding UTF8

# 4) optionale Typen
Ensure-Dir "src/types"
$typesTs = @"
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayRange = { from: string; to: string };
export type DayConfig = { closed: boolean; ranges: DayRange[] };
export type HoursJson = Record<DayKey, DayConfig>;
export type Holiday = { date: string; label: string };
export type HolidaysJson = { items: Holiday[] };
"@
Set-Content -Path "src/types/business.ts" -Value $typesTs -Encoding UTF8

Write-Host "✅ Dateien aktualisiert." -ForegroundColor Green

# 5) Prisma generate/migrate (falls vorhanden)
if (Test-Path $schemaPath) {
  try { npx prisma generate | Out-Null } catch {}
  try { npx prisma migrate dev -n "add_holidays_json" } catch {}
}

Write-Host "✅ Fertig. Starte dein Dev-Server neu und push zu Git für Vercel." -ForegroundColor Green
