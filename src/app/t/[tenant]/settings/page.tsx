import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = { title: "Einstellungen | Velora CRM" };
export const dynamic = "force-dynamic";

export default function TenantSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold mb-2">Unternehmens-Einstellungen</h1>
        <p className="text-sm opacity-70">
          Diese Einstellungen gelten für den ausgewählten Tenant und steuern
          die Buchbarkeit deiner Services.
        </p>
      </header>

      <SettingsForm />
    </div>
  );
}
