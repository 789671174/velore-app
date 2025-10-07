// app/entrepreneur/settings/page.tsx
import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Einstellungen | Velora CRM",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Unternehmens-Einstellungen
      </h1>
      <SettingsForm />
    </div>
  );
}
