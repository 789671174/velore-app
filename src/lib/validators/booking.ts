import { z } from "zod";

export const bookingSchema = z.object({
  tenant: z.string().min(1),
  firstName: z.string().min(1, "Vorname erforderlich"),
  lastName: z.string().min(1, "Nachname erforderlich"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Ungültige E-Mail"),
  date: z.string().min(1, "Datum erforderlich"),
  startTime: z.string().min(1, "Startzeit erforderlich"),
  endTime: z.string().min(1, "Endzeit erforderlich"),
  notes: z.string().optional().nullable(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Bitte AGB akzeptieren" }),
  }),
});

export type BookingInput = z.infer<typeof bookingSchema>;
