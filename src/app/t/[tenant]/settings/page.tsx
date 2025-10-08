import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = { title: "Einstellungen | Velora CRM" };
export const dynamic = "force-dynamic"; // immer frische Daten, kein Cache

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Unternehmens-Einstellungen</h1>
      <SettingsForm />
    </div>
  );
}

