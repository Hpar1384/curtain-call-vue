import posterHamlet from "@/assets/poster-hamlet.jpg";
import posterSeller from "@/assets/poster-seller.jpg";
import posterRhinoceros from "@/assets/poster-rhinoceros.jpg";
import posterVeil from "@/assets/poster-veil.jpg";

export type Session = {
  id: string;
  /** Persian formatted date, e.g. ۲۸ مرداد */
  date: string;
  /** Weekday label, e.g. جمعه */
  weekday: string;
  time: string;
};

export type Show = {
  id: string;
  title: string;
  description: string;
  poster: string;
  date: string;
  time: string;
  venue: string;
  duration: string;
  ageRating: string;
  price: number;
  availableSeats: number;
  director: string;
  genre: string;
  sessions: Session[];
};

export const shows: Show[] = [
  {
    id: "hamlet",
    title: "هملت",
    description:
      "اجرایی مدرن از تراژدی جاودانهٔ شکسپیر؛ روایتی از انتقام، جنون و سرنوشت.",
    poster: posterHamlet,
    date: "۲۸ مرداد ۱۴۰۵",
    time: "۲۰:۳۰",
    venue: "سالن اصلی — تئاتر شهر",
    duration: "۱۴۵ دقیقه",
    ageRating: "+۱۵",
    price: 350000,
    availableSeats: 42,
    director: "داریوش مهرجویی",
    genre: "تراژدی",
    sessions: [
      { id: "h1", date: "۲۸ مرداد", weekday: "چهارشنبه", time: "۲۰:۳۰" },
      { id: "h2", date: "۲۹ مرداد", weekday: "پنجشنبه", time: "۱۸:۰۰" },
      { id: "h3", date: "۲۹ مرداد", weekday: "پنجشنبه", time: "۲۱:۰۰" },
      { id: "h4", date: "۳۰ مرداد", weekday: "جمعه", time: "۲۰:۳۰" },
    ],
  },
  {
    id: "seller",
    title: "مرگ فروشنده",
    description:
      "بر اساس نمایشنامهٔ آرتور میلر؛ حکایتی تکان‌دهنده از رؤیاها، خانواده و خیانت.",
    poster: posterSeller,
    date: "۳ شهریور ۱۴۰۵",
    time: "۱۹:۰۰",
    venue: "سالن قشقایی — تئاتر شهر",
    duration: "۱۲۰ دقیقه",
    ageRating: "+۱۲",
    price: 280000,
    availableSeats: 12,
    director: "علی رفیعی",
    genre: "درام",
    sessions: [
      { id: "s1", date: "۳ شهریور", weekday: "شنبه", time: "۱۹:۰۰" },
      { id: "s2", date: "۴ شهریور", weekday: "یکشنبه", time: "۱۹:۰۰" },
      { id: "s3", date: "۵ شهریور", weekday: "دوشنبه", time: "۲۱:۰۰" },
    ],
  },
  {
    id: "rhinoceros",
    title: "کرگدن‌ها",
    description:
      "از نمایشنامهٔ اژن یونسکو؛ طنزی تاریک دربارهٔ هم‌رنگی با جماعت و فروپاشی فردیت.",
    poster: posterRhinoceros,
    date: "۱۱ شهریور ۱۴۰۵",
    time: "۱۸:۰۰",
    venue: "سالن سایه — فرهنگسرا نیاوران",
    duration: "۱۰۰ دقیقه",
    ageRating: "+۱۵",
    price: 220000,
    availableSeats: 0,
    director: "محمدعلی باسطی",
    genre: "آبسورد",
    sessions: [
      { id: "r1", date: "۱۱ شهریور", weekday: "یکشنبه", time: "۱۸:۰۰" },
      { id: "r2", date: "۱۲ شهریور", weekday: "دوشنبه", time: "۱۸:۰۰" },
    ],
  },
  {
    id: "veil",
    title: "پرده‌نشین‌ها",
    description:
      "روایتی تاریخی از پشت پرده‌های دربار؛ نمایشی پرشور از قدرت، راز و عشق.",
    poster: posterVeil,
    date: "۱۹ شهریور ۱۴۰۵",
    time: "۲۱:۰۰",
    venue: "سالن استاد سهراب — تالار وحدت",
    duration: "۱۳۰ دقیقه",
    ageRating: "+۱۸",
    price: 400000,
    availableSeats: 88,
    director: "کیومرث پوراحمد",
    genre: "تاریخی",
    sessions: [
      { id: "v1", date: "۱۹ شهریور", weekday: "دوشنبه", time: "۲۱:۰۰" },
      { id: "v2", date: "۲۰ شهریور", weekday: "سه‌شنبه", time: "۲۱:۰۰" },
      { id: "v3", date: "۲۲ شهریور", weekday: "پنجشنبه", time: "۱۹:۰۰" },
    ],
  },
];

/** Single access point for show data — swap this for a backend call later. */
export function getShows(): Show[] {
  return shows;
}

export function getShowById(id: string): Show | undefined {
  return shows.find((s) => s.id === id);
}

export function getSession(show: Show, sessionId: string): Session | undefined {
  return show.sessions.find((s) => s.id === sessionId);
}

export const MIN_TICKETS = 1;
export const MAX_TICKETS = 10;

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)]!);
}

export function formatPrice(toman: number): string {
  return toPersianNumber(toman.toLocaleString("en-US"));
}
