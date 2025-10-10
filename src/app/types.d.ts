export type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "declined";
};

export type TimeRange = {
  from: string;
  to: string;
};

export type VacationRange = {
  start: string;
  end?: string;
  note?: string;
};

export type ParsedBusinessSettings = {
  name: string;
  logoDataUrl?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  slotMinutes: number;
  bufferMinutes: number;
  workDays: number[];
  hours: Record<number, TimeRange[]>;
  vacationDays: VacationRange[];
  bookingNotes?: string | null;
};

export type Holiday = {
  id: string;
  date: string;
  reason?: string | null;
};
