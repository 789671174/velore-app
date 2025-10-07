"use client";
import { useEffect, useMemo, useState } from "react";

type DayKey = "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun";
type DayConfig = { closed:boolean; ranges:{from:string; to:string}[] };
type HoursJson = Record<DayKey, DayConfig>;
type Holiday = { date:string; label:string };
type HolidaysJson = { items: Holiday[] };

type Settings = {
  id: string; businessId: string;
  slotMinutes: number; bufferMinutes: number;
  hoursJson: string; holidaysJson?: string;
};

const DAY_LABELS: Record<DayKey,string> = { mon:"Montag", tue:"Dienstag", wed:"Mittwoch", thu:"Donnerstag", fri:"Freitag", sat:"Samstag", sun:"Sonntag" };
const DEFAULT_HOURS: HoursJson = {
  mon:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
  tue:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
  wed:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
  thu:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
  fri:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
  sat:{closed:true,ranges:[]}, sun:{closed:true,ranges:[]},
};
const emptyHolidays: HolidaysJson = { items: [] };

export default function SettingsPage(){
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState<string|null>(null);
  const [slotMinutes,setSlot]=useState(30); const [bufferMinutes,setBuf]=useState(0);
  const [hours,setHours]=useState<HoursJson>(DEFAULT_HOURS); const [holidays,setHolidays]=useState<HolidaysJson>(emptyHolidays);
  const tenant = useMemo(()=>{ if(typeof window==="undefined")return""; const p=location.pathname.split("/").filter(Boolean); const i=p.indexOf("t"); return i>=0?p[i+1]:"";},[]);

  useEffect(()=>{ (async()=>{
    try{
      setLoading(true);
      const res = await fetch(`/api/t/${tenant||"velora-hairstyles"}/settings`);
      if(!res.ok) throw new Error("Load failed");
      const data: Settings = await res.json();
      setSlot(data.slotMinutes??30); setBuf(data.bufferMinutes??0);
      try{ setHours({ ...DEFAULT_HOURS, ...JSON.parse(data.hoursJson||"{}")}); }catch{ setHours(DEFAULT_HOURS); }
      try{ const h=data.holidaysJson?JSON.parse(data.holidaysJson):emptyHolidays; setHolidays({items:Array.isArray(h?.items)?h.items:[]}); }catch{ setHolidays(emptyHolidays); }
    }catch(e:any){ setError(e.message||"Fehler"); } finally{ setLoading(false); }
  })(); },[tenant]);

  const updateDay=(d:DayKey,fn:(x:DayConfig)=>DayConfig)=>setHours(p=>({...p,[d]:fn(p[d]??{closed:true,ranges:[]})}));
  const addRange=(d:DayKey)=>updateDay(d,dd=>({...dd,closed:false,ranges:[...dd.ranges,{from:"09:00",to:"12:00"}]}));
  const rmRange=(d:DayKey,i:number)=>updateDay(d,dd=>({...dd,ranges:dd.ranges.filter((_,x)=>x!==i)}));
  const setRange=(d:DayKey,i:number,k:"from"|"to",v:string)=>updateDay(d,dd=>({...dd,ranges:dd.ranges.map((r,x)=>x===i?{...r,[k]:v}:r)}));
  const toggleClosed=(d:DayKey,c:boolean)=>updateDay(d,dd=>({ ...dd, closed:c, ranges:c?[]:(dd.ranges.length?dd.ranges:[{from:"09:00",to:"18:00"}]) }));

  const addHoliday=()=>setHolidays(h=>({items:[...h.items,{date:new Date().toISOString().slice(0,10),label:"Feiertag"}]}));
  const rmHoliday=(i:number)=>setHolidays(h=>({items:h.items.filter((_,x)=>x!==i)}));
  const setHoliday=(i:number,k:"date"|"label",v:string)=>setHolidays(h=>({items:h.items.map((it,x)=>x===i?{...it,[k]:v}:it)}));

  const save=async()=>{
    setSaving(true); setError(null);
    try{
      const body={ slotMinutes, bufferMinutes, hoursJson: JSON.stringify(hours), holidaysJson: JSON.stringify(holidays) };
      const res=await fetch(`/api/t/${tenant||"velora-hairstyles"}/settings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error("Speichern fehlgeschlagen");
    }catch(e:any){ setError(e.message||"Fehler"); } finally{ setSaving(false); }
  };

  if(loading) return <div className="p-6">Lade Einstellungen…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Einstellungen – {tenant||"Salon"}</h1>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <label className="flex flex-col gap-2"><span>Slot-Minuten</span>
          <input type="number" min={5} step={5} value={slotMinutes} onChange={e=>setSlot(parseInt(e.target.value||"0"))} className="px-3 py-2 rounded bg-neutral-800 text-white"/></label>
        <label className="flex flex-col gap-2"><span>Puffer (Minuten)</span>
          <input type="number" min={0} step={5} value={bufferMinutes} onChange={e=>setBuf(parseInt(e.target.value||"0"))} className="px-3 py-2 rounded bg-neutral-800 text-white"/></label>
      </div>
      <h2 className="text-xl font-semibold mb-3">Öffnungszeiten</h2>
      <div className="space-y-4 mb-8">
        {(Object.keys(DAY_LABELS) as DayKey[]).map(day=>{
          const cfg=hours[day]??{closed:true,ranges:[]};
          return (
            <div key={day} className="rounded-lg p-4 border border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="font-medium">{DAY_LABELS[day]}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={cfg.closed} onChange={e=>toggleClosed(day,e.target.checked)} /><span>Geschlossen</span>
                </label>
              </div>
              {!cfg.closed && (
                <div className="mt-3 space-y-2">
                  {cfg.ranges.map((r,idx)=>(
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex items-center gap-2"><span className="text-sm opacity-70">von</span>
                        <input type="time" value={r.from} onChange={e=>setRange(day,idx,"from",e.target.value)} className="px-2 py-1 rounded bg-neutral-800 text-white"/></div>
                      <div className="flex items-center gap-2"><span className="text-sm opacity-70">bis</span>
                        <input type="time" value={r.to} onChange={e=>setRange(day,idx,"to",e.target.value)} className="px-2 py-1 rounded bg-neutral-800 text-white"/></div>
                      <button onClick={()=>rmRange(day,idx)} className="px-2 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Entfernen</button>
                    </div>
                  ))}
                  <button onClick={()=>addRange(day)} className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Zeitspanne hinzufügen</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <h2 className="text-xl font-semibold mb-3">Feiertage / Schließtage</h2>
      <div className="space-y-3 mb-6">
        {holidays.items.map((h,idx)=>(
          <div key={idx} className="flex items-center gap-3">
            <input type="date" value={h.date} onChange={e=>setHoliday(idx,"date",e.target.value)} className="px-2 py-1 rounded bg-neutral-800 text-white"/>
            <input type="text" value={h.label} placeholder="Bezeichnung" onChange={e=>setHoliday(idx,"label",e.target.value)} className="flex-1 px-2 py-1 rounded bg-neutral-800 text-white"/>
            <button onClick={()=>rmHoliday(idx)} className="px-2 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Entfernen</button>
          </div>
        ))}
        <button onClick={addHoliday} className="px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600">Feiertag hinzufügen</button>
      </div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">{saving?"Speichere…":"Speichern"}</button>
      {error && <div className="mt-4 text-red-400">{error}</div>}
    </div>
  );
}