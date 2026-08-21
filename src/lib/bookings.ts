export type Booking = {
  id: string;
  showId: string;
  showTitle: string;
  poster: string;
  venue: string;
  date: string;
  weekday: string;
  time: string;
  seats: string[];
  unitPrice: number;
  total: number;
  createdAt: number;
};

const KEY = "tr_bookings_v1";
const listeners = new Set<() => void>();
let cache: Booking[] | null = null;

function read(): Booking[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Booking[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  listeners.forEach((l) => l());
}

/** Local booking store — swap for a backend table later. */
export const bookingStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getAll(): Booking[] {
    return read();
  },
  add(booking: Omit<Booking, "id" | "createdAt">): Booking {
    const full: Booking = {
      ...booking,
      id: `${booking.showId}-${Date.now()}`,
      createdAt: Date.now(),
    };
    write([full, ...read()]);
    return full;
  },
};
