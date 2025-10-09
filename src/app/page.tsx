"use client";

import Link from "next/link";

const TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? "velora-hairstyles";

export default function Start() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-semibold">Velora – Starter</h1>
        <p className="opacity-75">Wer bist du?</p>
        <div className="flex gap-4 justify-center">
          <Link
            href={`/t/${TENANT}/booking`}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
          >
            Kunde
          </Link>
          <Link
            href={`/t/${TENANT}/dashboard`}
            className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600"
          >
            Unternehmer
          </Link>
        </div>
      </div>
    </main>
  );
}
