"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Slot = { time: string; iso: string };

type BookingForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const DEFAULT_FORM: BookingForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

export default function BookingPage() {
  const params = useParams();
  const tenant = useMemo(() => {
    const slug = params?.tenant as string | undefined;
    return slug ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "velora-hairstyles";
  }, [params]);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pick, setPick] = useState<Slot | null>(null);
  const [form, setForm] = useState<BookingForm>(DEFAULT_FORM);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadSlots = async (selectedDate: string) => {
    setLoadingSlots(true);
    setPick(null);
    try {
      const res = await fetch(`/api/t/${tenant}/slots?date=${selectedDate}`);
      if (res.ok) {
        const payload = (await res.json()) as { slots: Slot[] };
        setSlots(payload.slots ?? []);
      } else {
        setSlots([]);
      }
    } catch (error) {
      console.error("Slots konnten nicht geladen werden", error);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots(date);
  }, [tenant, date]);

  const onChange = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pick) {
      alert("Bitte eine Uhrzeit wählen");
      return;
    }
    try {
      const res = await fetch(`/api/t/${tenant}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date, time: pick.time }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Fehler beim Senden");
      }
      alert("Anfrage gesendet ✅");
      setForm(DEFAULT_FORM);
      setPick(null);
      loadSlots(date);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Fehler beim Senden");
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Buchung – {tenant || "Salon"}</h1>
      <div className="mb-4">
        <input
          type="date"
          className="px-3 py-2 rounded bg-neutral-800 text-white"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <div className="mb-2 opacity-70">Freie Zeiten</div>
        <div className="flex flex-wrap gap-2">
          {loadingSlots && <span className="opacity-60">Lade Slots…</span>}
          {!loadingSlots && slots.length === 0 && (
            <span className="opacity-60">Keine freien Slots</span>
          )}
          {slots.map((s) => (
            <button
              key={s.iso}
              type="button"
              onClick={() => setPick(s)}
              className={
                "px-3 py-1 rounded border " +
                (pick?.iso === s.iso
                  ? "bg-emerald-600 border-emerald-500"
                  : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700")
              }
            >
              {s.time}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="px-3 py-2 rounded bg-neutral-800 text-white"
            placeholder="Vorname"
            value={form.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            required
          />
          <input
            className="px-3 py-2 rounded bg-neutral-800 text-white"
            placeholder="Nachname"
            value={form.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            required
          />
        </div>
        <input
          className="px-3 py-2 rounded bg-neutral-800 text-white"
          placeholder="E-Mail"
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          required
        />
        <input
          className="px-3 py-2 rounded bg-neutral-800 text-white"
          placeholder="Telefon (optional)"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
        <button className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">
          Anfrage senden
        </button>
      </form>
    </main>
  );
}
