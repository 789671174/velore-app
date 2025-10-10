import { z } from "zod";

export const breakSchema = z.object({
  start: z.string().min(1, "Startzeit erforderlich"),
  end: z.string().min(1, "Endzeit erforderlich"),
});

export const daySchema = z.object({
  day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  enabled: z.boolean(),
  open: z.string().min(1, "Öffnungszeit"),
  close: z.string().min(1, "Schließzeit"),
  breaks: z.array(breakSchema).default([]),
});

export const settingsSchema = z.object({
  businessName: z.string().min(1, "Firmenname erforderlich"),
  email: z.string().email("Ungültige E-Mail"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  businessHours: z.array(daySchema),
  holidays: z.array(z.string()),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
