import SettingsForm from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Einstellungen | Velora App",
};

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 rounded border px-3 py-2 text-sm">
        <strong>✅ Einstellungen-Seite geladen.</strong>{" "}
        (Wenn du das siehst, rendert diese Route richtig.)
      </div>

      <h1 className="text-2xl font-semibold mb-4">Unternehmens-Einstellungen</h1>

      <SettingsForm />
    </div>
  );
}
