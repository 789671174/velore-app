"use client";
import { useEffect, useMemo, useState } from "react";

type Slot = { time: string; iso: string };

export default function BookingPage() {
  const tenant = useMemo(()=>{ if(typeof window==="undefined")return""; const p=location.pathname.split("/").filter(Boolean); const i=p.indexOf("t"); return i>=0?p[i+1]:"";},[]);
  const [date,setDate]=useState(()=> new Date().toISOString().slice(0,10));
  const [slots,setSlots]=useState<Slot[]>([]);
  const [pick,setPick]=useState<Slot|null>(null);
  const [form,setForm]=useState({ firstName:"", lastName:"", email:"", phone:"" });

  const loadSlots=async(d:string)=>{
    setPick(null);
    const res=await fetch(`/api/t/${tenant||"velora-hairstyles"}/slots?date=${d}`);
    if(res.ok){ setSlots(await res.json()); } else { setSlots([]); }
  };

  useEffect(()=>{ loadSlots(date); },[tenant, date]);

  const submit=async(e:any)=>{
    e.preventDefault();
    if(!pick){ alert("Bitte eine Uhrzeit wählen"); return; }
    const res = await fetch(`/api/t/${tenant||"velora-hairstyles"}/booking`,{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ ...form, date, time: pick.time })
    });
    if(res.ok){ alert("Anfrage gesendet ✅"); setForm({firstName:"",lastName:"",email:"",phone:""}); loadSlots(date); setPick(null); }
    else { alert("Fehler beim Senden"); }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Buchung – {tenant||"Salon"}</h1>
      <div className="mb-4">
        <input type="date" className="px-3 py-2 rounded bg-neutral-800 text-white" value={date} onChange={e=>setDate(e.target.value)}/>
      </div>

      <div className="mb-6">
        <div className="mb-2 opacity-70">Freie Zeiten</div>
        <div className="flex flex-wrap gap-2">
          {slots.length===0 && <span className="opacity-60">Keine freien Slots</span>}
          {slots.map(s=>(
            <button key={s.iso} onClick={()=>setPick(s)}
              className={"px-3 py-1 rounded border " + (pick?.iso===s.iso? "bg-emerald-600 border-emerald-500":"bg-neutral-800 border-neutral-700 hover:bg-neutral-700")}>
              {s.time}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="px-3 py-2 rounded bg-neutral-800 text-white" placeholder="Vorname" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} required/>
          <input className="px-3 py-2 rounded bg-neutral-800 text-white" placeholder="Nachname" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} required/>
        </div>
        <input className="px-3 py-2 rounded bg-neutral-800 text-white" placeholder="E-Mail" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
        <input className="px-3 py-2 rounded bg-neutral-800 text-white" placeholder="Telefon (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
        <button className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Anfrage senden</button>
      </form>
    </main>
  );
}