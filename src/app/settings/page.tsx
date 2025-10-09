import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Einstellungen | Velora App",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold mb-2">Unternehmens-Einstellungen</h1>
        <p className="text-sm opacity-70">
          Passe Stammdaten und Öffnungszeiten deines Salons an. Änderungen
          wirken sich sofort auf die Buchungsseite aus.
        </p>
      </header>

      <SettingsForm />
    </div>
  );
}
