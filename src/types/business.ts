export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayRange = { from: string; to: string };
export type DayConfig = { closed: boolean; ranges: DayRange[] };
export type HoursJson = Record<DayKey, DayConfig>;
export type Holiday = { date: string; label: string };
export type HolidaysJson = { items: Holiday[] };
