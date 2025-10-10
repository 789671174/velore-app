export const bookingStatusTheme = {
  pending: {
    label: "Offen",
    badgeClass:
      "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/40 dark:text-amber-300",
    borderClass: "border-amber-500/40",
    calendarClass:
      "border border-amber-500/70 text-amber-700 dark:text-amber-300 after:absolute after:-bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-500 after:content-['']",
    legendDotClass: "bg-amber-500",
  },
  confirmed: {
    label: "Bestätigt",
    badgeClass:
      "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300",
    borderClass: "border-emerald-500/40",
    calendarClass:
      "border border-emerald-500/70 text-emerald-700 dark:text-emerald-300 after:absolute after:-bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500 after:content-['']",
    legendDotClass: "bg-emerald-500",
  },
  cancelled: {
    label: "Storniert",
    badgeClass:
      "border border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/60",
    borderClass: "border-destructive/50",
    calendarClass:
      "border border-destructive/70 text-destructive after:absolute after:-bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-destructive after:content-['']",
    legendDotClass: "bg-destructive",
  },
} as const;

export type BookingStatusKey = keyof typeof bookingStatusTheme;

export const mixedStatusTheme = {
  label: "Gemischt",
  calendarClass:
    "border border-primary/70 text-primary after:absolute after:-bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-['']",
  legendDotClass: "bg-primary",
} as const;
