import { addMinutes, eachDayOfInterval, format, isEqual, isWithinInterval, parse, set } from "date-fns";
import { de } from "date-fns/locale";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type BusinessHour = {
  day: Weekday;
  enabled: boolean;
  open: string;
  close: string;
  breaks: { start: string; end: string }[];
};

export type Holiday = string;

const dayIndex: Record<Weekday, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 0,
};

export function getWeekdayLabel(day: Weekday) {
  const today = new Date();
  const todayIndex = today.getDay();
  const targetIndex = dayIndex[day];
  const diff = (targetIndex - todayIndex + 7) % 7;
  const adjusted = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return format(adjusted, "EEEE", { locale: de });
}

export function buildTimeSlots(
  date: Date,
  hours: BusinessHour[],
  holidays: Holiday[],
  slotMinutes = 15,
) {
  const isoDate = format(date, "yyyy-MM-dd");
  if (holidays.includes(isoDate)) {
    return [];
  }

  const weekday = date.getDay();
  const dayConfig = hours.find((item) => dayIndex[item.day] === weekday);

  if (!dayConfig || !dayConfig.enabled) {
    return [];
  }

  const openParts = dayConfig.open.split(":").map(Number);
  const closeParts = dayConfig.close.split(":").map(Number);

  const start = set(date, { hours: openParts[0], minutes: openParts[1], seconds: 0, milliseconds: 0 });
  const end = set(date, { hours: closeParts[0], minutes: closeParts[1], seconds: 0, milliseconds: 0 });

  const breaks = dayConfig.breaks.map((pause) => {
    const startParts = pause.start.split(":").map(Number);
    const endParts = pause.end.split(":").map(Number);
    return {
      start: set(date, { hours: startParts[0], minutes: startParts[1], seconds: 0, milliseconds: 0 }),
      end: set(date, { hours: endParts[0], minutes: endParts[1], seconds: 0, milliseconds: 0 }),
    };
  });

  const slots: { start: Date; end: Date }[] = [];
  let cursor = start;

  while (cursor < end) {
    const slotEnd = addMinutes(cursor, slotMinutes);
    if (slotEnd > end || slotEnd <= cursor) {
      break;
    }

    const inBreak = breaks.some((pause) =>
      isWithinInterval(cursor, { start: pause.start, end: pause.end }) ||
      isWithinInterval(slotEnd, { start: pause.start, end: pause.end }) ||
      isEqual(cursor, pause.end),
    );

    if (!inBreak) {
      slots.push({ start: cursor, end: slotEnd });
    }

    cursor = slotEnd;
  }

  return slots.map((slot) => ({
    start: slot.start,
    end: slot.end,
    label: `${format(slot.start, "HH:mm")} – ${format(slot.end, "HH:mm")}`,
  }));
}

export function getDaysBetween(start: Date, end: Date) {
  return eachDayOfInterval({ start, end }).map((day) => format(day, "yyyy-MM-dd"));
}

export function parseTime(value: string) {
  return parse(value, "HH:mm", new Date());
}
