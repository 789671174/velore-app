import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  buildTenantSettingsPayload,
  normalizeTenantSlug,
  type TenantSettingsPayload,
} from "@/app/lib/tenant";

const DATE_FORMAT = new Intl.DateTimeFormat("de-CH", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100",
  declined: "bg-rose-100 text-rose-800 dark:bg-rose-400/20 dark:text-rose-100",
};

type PageProps = {
  params: {
    tenant?: string;
  };
};

type BookingRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  date: string;
  time: string;
  status: string;
  createdAt: string;
};

export default async function DashboardPage({ params }: PageProps) {
  const slug = normalizeTenantSlug(params?.tenant);
  if (!slug) {
    return notFound();
  }

  try {
    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) {
      return notFound();
    }

    const [settingsRecord, bookings] = await Promise.all([
      prisma.settings.findUnique({ where: { businessId: business.id } }),
      prisma.booking.findMany({
        where: { businessId: business.id },
        orderBy: [
          { date: "asc" },
          { time: "asc" },
        ],
      }),
    ]);

    const settings = buildTenantSettingsPayload(business, settingsRecord);
    const timezone = settings.timezone;
    const bookingRows = bookings.map<BookingRow>((booking) => ({
      id: booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone ?? null,
      date: formatDateLabel(booking.date, timezone),
      time: booking.time,
      status: booking.status,
      createdAt: DATE_FORMAT.format(booking.createdAt),
    }));

    const stats = buildBookingStats(bookings);

    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#111a2e] dark:shadow-black/40 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{settings.tenant}</p>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {settings.name || "Unternehmer Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Übersicht über Termine, Status und schnelle Aktionen.
            </p>
          </div>
          <Link
            href={`/t/${settings.tenant}/entrepreneur/settings`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700 dark:hover:border-blue-400 dark:hover:text-blue-200"
          >
            Einstellungen öffnen
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Gesamtbuchungen" value={stats.total.toString()} />
          <StatCard label="Ausstehend" value={stats.pending.toString()} tone="warning" />
          <StatCard label="Bestätigt" value={stats.accepted.toString()} tone="success" />
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#111a2e] dark:shadow-black/40">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Gebuchte Termine</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Zeigt alle Anfragen in chronologischer Reihenfolge. Zeitzone: {timezone}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {bookingRows.length === 0 ? (
              <EmptyState tenant={settings} />
            ) : (
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                <thead>
                  <tr className="text-left text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-6 py-3">Datum</th>
                    <th className="px-6 py-3">Zeit</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Kontakt</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Erstellt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {bookingRows.map((booking) => (
                    <tr key={booking.id} className="text-sm text-neutral-900 dark:text-neutral-100">
                      <td className="px-6 py-3 font-medium">{booking.date}</td>
                      <td className="px-6 py-3">{booking.time}</td>
                      <td className="px-6 py-3">{booking.firstName} {booking.lastName}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span>{booking.email}</span>
                          {booking.phone ? (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{booking.phone}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[booking.status] ??
                            "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100"
                          }`}
                        >
                          {statusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-300">{booking.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    console.error("Entrepreneur dashboard failed", error);
    return <DashboardError />;
  }
}

function buildBookingStats(bookings: { status: string }[]) {
  return bookings.reduce(
    (acc, booking) => {
      acc.total += 1;
      if (booking.status === "pending") acc.pending += 1;
      if (booking.status === "accepted") acc.accepted += 1;
      return acc;
    },
    { total: 0, pending: 0, accepted: 0 },
  );
}

function formatDateLabel(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("de-CH", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(date);
  } catch {
    return DATE_FORMAT.format(date);
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Bestätigt";
    case "declined":
      return "Abgelehnt";
    default:
      return "Ausstehend";
  }
}

type StatCardProps = {
  label: string;
  value: string;
  tone?: "success" | "warning";
};

function StatCard({ label, value, tone }: StatCardProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
        : "bg-neutral-100 text-neutral-800 dark:bg-neutral-700/30 dark:text-neutral-200";

  return (
    <div className={`rounded-2xl border border-neutral-200 p-5 shadow-sm dark:border-neutral-800 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

type EmptyStateProps = {
  tenant: TenantSettingsPayload;
};

function EmptyState({ tenant }: EmptyStateProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-neutral-600 dark:text-neutral-300">
      <p className="text-lg font-medium">Noch keine Buchungen vorhanden</p>
      <p className="max-w-md text-sm">
        Sobald Kunden über die Buchungsseite Termine anfragen, erscheinen sie hier automatisch für den Tenant
        <span className="font-semibold"> {tenant.tenant}</span>.
      </p>
      <Link
        href={`/client?tenant=${tenant.tenant}`}
        className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700 dark:hover:border-blue-400 dark:hover:text-blue-200"
      >
        Buchungsseite öffnen
      </Link>
    </div>
  );
}

function DashboardError() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 dark:border-rose-400/50 dark:bg-rose-400/20 dark:text-rose-100">
        <h1 className="text-2xl font-semibold">Dashboard konnte nicht geladen werden</h1>
        <p className="mt-3 text-sm">
          Bitte versuche es später erneut oder prüfe die Server-Logs für weitere Details.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium transition hover:border-rose-500 hover:text-rose-600 dark:border-rose-400/60 dark:hover:border-rose-200 dark:hover:text-rose-50"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
