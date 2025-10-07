"use client";
import { useEffect, useMemo, useState } from "react";
type Booking = { id:string; firstName:string; lastName:string; email:string; phone?:string; start:string; end:string; status:string };

export default function DashboardPage(){
  const tenant = useMemo(()=>{ if(typeof window==="undefined")return""; const p=location.pathname.split("/").filter(Boolean); const i=p.indexOf("t"); return i>=0?p[i+1]:"";},[]);
  const [items,setItems]=useState<Booking[]>([]);
  const load=async()=>{ const r=await fetch(`/api/t/${tenant||"velora-hairstyles"}/booking`); if(r.ok) setItems(await r.json()); };
  useEffect(()=>{ load(); },[tenant]);

  const setStatus=async(id:string,status:"accepted"|"declined")=>{
    const r=await fetch(`/api/t/${tenant||"velora-hairstyles"}/booking/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    if(r.ok) load();
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Dashboard – {tenant||"Salon"}</h1>
      <div className="space-y-3">
        {items.length===0 && <div className="opacity-60">Keine Anfragen</div>}
        {items.map(b=>(
          <div key={b.id} className="p-4 rounded border border-neutral-700 flex items-center justify-between">
            <div>
              <div className="font-medium">{b.firstName} {b.lastName} – <span className="opacity-70">{new Date(b.start).toLocaleString()}</span></div>
              <div className="text-sm opacity-70">{b.email}{b.phone?` · ${b.phone}`:""} · Status: {b.status}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setStatus(b.id,"accepted")} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500">Annehmen</button>
              <button onClick={()=>setStatus(b.id,"declined")} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500">Ablehnen</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}