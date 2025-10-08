// src/app/t/[tenant]/settings/page.tsx
import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = { title: "Einstellungen | Velora CRM" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* DEBUG-Banner: immer sichtbar, damit klar ist, dass die Seite gerendert hat */}
      <div className="mb-4 rounded border px-3 py-2 text-sm">
        <strong>✅ Einstellungen-Seite geladen.</strong>{" "}
        URL: <code>{typeof window !== "undefined" ? window.location.pathname : ""}</code>
      </div>

      <h1 className="text-2xl font-semibold mb-4">Unternehmens-Einstellungen</h1>
      <SettingsForm />
    </div>
  );
}
