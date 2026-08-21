import posterHamlet from "@/assets/poster-hamlet.jpg";
import posterSeller from "@/assets/poster-seller.jpg";
import posterRhinoceros from "@/assets/poster-rhinoceros.jpg";
import posterVeil from "@/assets/poster-veil.jpg";

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
  },
];

/** Single access point for show data — swap this for a backend call later. */
export function getShows(): Show[] {
  return shows;
}

export function getShowById(id: string): Show | undefined {
  return shows.find((s) => s.id === id);
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
