// src/app/entrepreneur/settings/SettingsView.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Falls du sonner nutzt, sonst kannst du toast entfernen
import SettingsForm from "@/components/settings/SettingsForm";

type BusinessSettings = {
  name?: string;
  email?: string;
  logoUrl?: string;
  workDays?: string[];
  workHours?: { start: string; end: string };
  holidays?: { start: string; end: string; description?: string }[];
};

export default function SettingsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Lädt die gespeicherten Einstellungen aus der API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data = await res.json();
        setSettings(data);
      } catch (e) {
        console.error(e);
        toast.error("Fehler beim Laden der Einstellungen");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Wenn Daten gespeichert werden, rufe /api/settings POST auf
  const handleSave = async (newSettings: BusinessSettings) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      toast.success("Einstellungen gespeichert");
      setSettings(newSettings);
    } catch (e) {
      console.error(e);
      toast.error("Speichern fehlgeschlagen");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-400 text-center">Lade Einstellungen...</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Unternehmens-Einstellungen</h1>
      <SettingsForm
        initialData={settings}
        onSave={handleSave}
      />
    </div>
  );
}

