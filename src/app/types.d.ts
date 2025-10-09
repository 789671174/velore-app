export type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  start: string;
  end: string;
  status: "pending" | "accepted" | "declined";
};

export type BusinessSettings = {
  companyName: string;
  email: string;
  workingDays: string[];
  openFrom: string;
  openTo: string;
  slotMinutes: number;
  bufferMinutes: number;
};

export type Holiday = {
  id: string;
  date: string;
  reason?: string | null;
};
