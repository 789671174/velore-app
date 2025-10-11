"use client";

import Link from "next/link";

export default function EntrepreneurError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="max-w-lg space-y-6 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 shadow-sm dark:border-rose-400/40 dark:bg-rose-400/20 dark:text-rose-100">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-rose-500 dark:text-rose-200">Fehler</p>
          <h1 className="text-2xl font-semibold">Unternehmerbereich vorübergehend nicht verfügbar</h1>
          <p className="text-sm text-rose-700/80 dark:text-rose-100/80">
            Beim Laden der Seite ist ein Fehler aufgetreten. Bitte versuche es erneut oder kehre zum Dashboard zurück.
          </p>
        </header>

        {error?.digest ? (
          <p className="text-xs text-rose-500/80 dark:text-rose-100/70">Fehler-ID: {error.digest}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium transition hover:border-rose-500 hover:text-rose-600 dark:border-rose-300/60 dark:hover:border-rose-200 dark:hover:text-rose-50"
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:text-white"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
