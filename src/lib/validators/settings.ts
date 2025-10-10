import { z } from "zod";

import { DEFAULT_BUSINESS_HOURS } from "@/lib/defaults";
import { WEEKDAYS, parseTime, type BusinessHour, type Weekday } from "@/lib/time";

const timeRegex = /^\d{2}:\d{2}$/;

export const breakSchema = z
  .object({
    start: z
      .string()
      .regex(timeRegex, "Zeit im Format HH:MM")
      .describe("Beginn der Pause"),
    end: z
      .string()
      .regex(timeRegex, "Zeit im Format HH:MM")
      .describe("Ende der Pause"),
  })
  .superRefine((value, ctx) => {
    const start = parseTime(value.start);
    const end = parseTime(value.end);

    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pausenende muss nach Pausenbeginn liegen",
        path: ["end"],
      });
    }
  });

const defaultDayLookup: Record<Weekday, BusinessHour> = DEFAULT_BUSINESS_HOURS.reduce(
  (acc, hour) => ({
    ...acc,
    [hour.day]: { ...hour, breaks: hour.breaks.map((pause) => ({ ...pause })) },
  }),
  {} as Record<Weekday, BusinessHour>,
);

const businessHoursArraySchema = z
  .array(
    z
      .object({
        day: z.enum(WEEKDAYS),
        enabled: z.boolean(),
        open: z.string().regex(timeRegex, "Zeit im Format HH:MM"),
        close: z.string().regex(timeRegex, "Zeit im Format HH:MM"),
        breaks: z.array(breakSchema).default([]),
      })
      .superRefine((value, ctx) => {
        if (!value.enabled) {
          return;
        }

        const open = parseTime(value.open);
        const close = parseTime(value.close);

        if (open >= close) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Öffnungszeit muss vor Schließzeit liegen",
            path: ["close"],
          });
        }

        const sortedBreaks = [...(value.breaks ?? [])].sort(
          (a, b) => parseTime(a.start).getTime() - parseTime(b.start).getTime(),
        );

        let previousEnd = open;
        sortedBreaks.forEach((pause, index) => {
          const pauseStart = parseTime(pause.start);
          const pauseEnd = parseTime(pause.end);

          if (pauseStart < open || pauseEnd > close) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Pause liegt außerhalb der Öffnungszeiten",
              path: ["breaks", index],
            });
          }

          if (pauseStart < previousEnd) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Pausen überschneiden sich",
              path: ["breaks", index],
            });
          }

          previousEnd = pauseEnd;
        });
      }),
  )
  .transform((items) => {
    const unique = new Map<Weekday, BusinessHour>();

    for (const item of items) {
      if (!unique.has(item.day)) {
        unique.set(item.day, {
          ...item,
          breaks: (item.breaks ?? []).map((pause) => ({ ...pause })),
        });
      }
    }

    return WEEKDAYS.map((day) => {
      const value = unique.get(day) ?? defaultDayLookup[day];
      return { ...value, breaks: value.breaks.map((pause) => ({ ...pause })) };
    });
  });

const holidaysSchema = z
  .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT"))
  .transform((days) => Array.from(new Set(days)).sort());

export const settingsSchema = z.object({
  businessName: z.string().min(1, "Firmenname erforderlich"),
  email: z.string().email("Ungültige E-Mail"),
  phone: z
    .string()
    .trim()
    .max(100, "Telefonnummer zu lang")
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(200, "Adresse zu lang")
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(500, "Notizen zu lang")
    .optional()
    .nullable(),
  businessHours: businessHoursArraySchema,
  holidays: holidaysSchema,
});

export const availabilitySchema = z.object({
  businessHours: businessHoursArraySchema,
  holidays: holidaysSchema,
});

export const bookingSettingsSchema = availabilitySchema.extend({
  businessName: settingsSchema.shape.businessName,
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;
