export type AdminStats = {
  activeShows: number;
  upcomingSessions: number;
  bookingsToday: number;
  ticketsSold: number;
  checkinsToday: number;
  revenue: number;
  users: number;
};

export type AdminAuditDTO = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type AdminShowDTO = {
  id: string;
  slug: string;
  title: string;
  description: string;
  poster_key: string;
  is_active: boolean;
  director: string | null;
  genre: string | null;
  duration_minutes: number;
  age_rating: string | null;
  price: number;
  sort_order: number;
  hall_id: string;
  hallName: string;
};

export type AdminHallDTO = {
  id: string;
  name: string;
  rows_count: number;
  seats_per_row: number;
  theater_id: string;
  theaterName: string;
  capacity: number;
  showCount: number;
  layoutLocked: boolean;
};

export type AdminSessionDTO = {
  id: string;
  show_id: string;
  date_label: string;
  weekday_label: string;
  time_label: string;
  sort_order: number;
  showTitle: string;
  hallName: string;
  capacity: number;
  activeBookings: number;
  ticketsTotal: number;
  checkedIn: number;
};

export type AdminBookingDTO = {
  id: string;
  userId: string;
  status: "pending" | "awaiting_payment" | "confirmed" | "cancelled";
  total: number;
  seatCount: number;
  createdAt: string;
  showTitle: string;
  session: string;
  seats: string[];
};

export type AdminTicketDTO = {
  id: string;
  userId: string;
  code: string;
  seat: string;
  status: "valid" | "used" | "cancelled";
  createdAt: string;
  showTitle: string;
  session: string;
};
