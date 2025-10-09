"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  start: string;
  end: string;
  status: string;
};

export default function DashboardPage() {
  const params = useParams();
  const tenant = useMemo(() => {
    const slug = params?.tenant as string | undefined;
    return slug ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "velora-hairstyles";
  }, [params]);

  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${tenant}/bookings`);
      if (res.ok) {
        const data = (await res.json()) as Booking[];
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenant]);

  const setStatus = async (id: string, status: "accepted" | "declined") => {
    const res = await fetch(`/api/t/${tenant}/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      load();
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error ?? "Status konnte nicht aktualisiert werden.");
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Dashboard – {tenant || "Salon"}</h1>
      <div className="space-y-3">
        {loading && <div className="opacity-60">Lade Anfragen…</div>}
        {!loading && items.length === 0 && (
          <div className="opacity-60">Keine Anfragen</div>
        )}
        {items.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded border border-neutral-700 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-medium">
                {b.firstName} {b.lastName} –
                <span className="opacity-70">
                  {" "}
                  {new Date(b.start).toLocaleString()}
                </span>
              </div>
              <div className="text-sm opacity-70">
                {b.email}
                {b.phone ? ` · ${b.phone}` : ""} · Status: {b.status}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus(b.id, "accepted")}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
              >
                Annehmen
              </button>
              <button
                onClick={() => setStatus(b.id, "declined")}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
