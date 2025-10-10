export type TimeRange = {
  from: string;
  to: string;
};

export type VacationRange = {
  start: string;
  end?: string;
  note?: string;
};

export const DEFAULT_WORK_DAYS: number[] = [1, 2, 3, 4, 5];

export const DEFAULT_HOURS: Record<number, TimeRange[]> = {
  1: [{ from: "09:00", to: "17:00" }],
  2: [{ from: "09:00", to: "17:00" }],
  3: [{ from: "09:00", to: "17:00" }],
  4: [{ from: "09:00", to: "17:00" }],
  5: [{ from: "09:00", to: "15:00" }],
};

export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse JSON setting", error);
    return fallback;
  }
}

export function normalizeWorkDays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? parseInt(value, 10) : value))
        .filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ).sort((a, b) => a - b);
}

export function normalizeHours(input: unknown): Record<number, TimeRange[]> {
  if (!input || typeof input !== "object") return {};

  const result: Record<number, TimeRange[]> = {};
  const entries = Object.entries(input as Record<string, unknown>);

  for (const [key, value] of entries) {
    const day = Number(key);
    if (!Number.isInteger(day)) continue;

    if (Array.isArray(value)) {
      result[day] = value
        .map((slot) => {
          if (!slot || typeof slot !== "object") return null;
          const { from, to } = slot as Partial<TimeRange>;
          if (!from || !to) return null;
          return { from, to } as TimeRange;
        })
        .filter(Boolean) as TimeRange[];
      continue;
    }

    if (value && typeof value === "object" && Array.isArray((value as any).open)) {
      const open = (value as any).open as [string, string][];
      result[day] = open
        .map(([from, to]) => ({ from, to }))
        .filter(({ from, to }) => Boolean(from && to));
    }
  }

  return result;
}

export function isDateWithinVacation(date: string, range: VacationRange): boolean {
  if (!range.start) return false;
  const target = new Date(date + "T00:00:00");
  const from = new Date(range.start + "T00:00:00");
  const to = range.end ? new Date(range.end + "T23:59:59") : from;
  return target >= from && target <= to;
}

export function sanitizeVacationRanges(value: unknown): VacationRange[] {
  if (!Array.isArray(value)) return [];
  return (value as VacationRange[])
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const start = (entry as VacationRange).start;
      if (!start) return null;
      const end = (entry as VacationRange).end;
      const note = (entry as VacationRange).note;
      return {
        start,
        end: end || undefined,
        note: note?.toString().trim() || undefined,
      } satisfies VacationRange;
    })
    .filter(Boolean) as VacationRange[];
}
