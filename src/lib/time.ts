import { addMinutes, eachDayOfInterval, format, isEqual, isWithinInterval, parse, set } from "date-fns";
import { de } from "date-fns/locale";

export type BusinessHour = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
  breaks: { start: string; end: string }[];
};

export type Holiday = string;

const dayIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getWeekdayLabel(day: string) {
  const base = new Date();
  const diff = dayIndex[day] - base.getDay();
  const adjusted = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
  return format(adjusted, "EEE", { locale: de });
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
  const dayConfig = hours.find((day) => dayIndex[day.day] === weekday);

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
