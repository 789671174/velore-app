import Link from "next/link";

const DEFAULT_TENANT =
  process.env.NEXT_PUBLIC_DEFAULT_TENANT ||
  process.env.DEFAULT_TENANT ||
  "velora-hairstyles";

export default function Start() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-6">Velora – Starter</h1>
        <p className="mb-6 opacity-75">Wähle eine Seite:</p>
        <div className="flex items-center gap-4 justify-center">
          <Link
            href={/t/\velora-hairstyles/client}
            className="rounded-xl border border-white/15 px-5 py-3 hover:bg-white/5"
          >
            Kundenseite
          </Link>
          <Link
            href={/t/\velora-hairstyles/entrepreneur}
            className="rounded-xl border border-white/15 px-5 py-3 hover:bg-white/5"
          >
            Unternehmer
          </Link>
        </div>
      </div>
    </main>
  );
}
