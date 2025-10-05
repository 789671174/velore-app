// src/app/page.tsx
import React from "react";

export default function Start() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-6">Velora – Starter</h1>
        <p className="mb-6 opacity-75">Wähle eine Seite:</p>

        <div className="flex gap-4 justify-center">
          <a href="/t/velora-hairstyles/booking" className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500">
            Buchung
          </a>
          <a href="/t/velora-hairstyles/dashboard" className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">
            Dashboard
          </a>
          <a href="/t/velora-hairstyles/settings" className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">
            Einstellungen
          </a>
        </div>
      </div>
    </main>
  );
}
