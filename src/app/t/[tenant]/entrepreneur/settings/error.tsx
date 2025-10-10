"use client";

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold">Einstellungen konnten nicht geladen werden.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Bitte versuche es erneut. Sollte das Problem bestehen, kontaktiere den Support.
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
