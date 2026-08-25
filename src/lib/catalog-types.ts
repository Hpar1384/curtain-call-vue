export type SessionDTO = {
  id: string;
  date: string;
  weekday: string;
  time: string;
};

export type ShowDTO = {
  id: string;
  title: string;
  description: string;
  posterKey: string;
  date: string;
  time: string;
  venue: string;
  duration: string;
  ageRating: string;
  price: number;
  availableSeats: number;
  director: string;
  genre: string;
  sessions: SessionDTO[];
};

export type SeatDTO = {
  id: string;
  showSeatId: string;
  row: string;
  number: number;
  status: "free" | "reserved";
};

export type BookingDTO = {
  id: string;
  showSlug: string;
  showTitle: string;
  posterKey: string;
  venue: string;
  date: string;
  weekday: string;
  time: string;
  seats: string[];
  total: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};
