export type Show = {
  id: string;
  title: string;
  director: string;
  date: string;
  time: string;
  hall: string;
  price: number;
  seatsLeft: number;
  totalSeats: number;
  duration: string;
  genre: string;
  rating: number;
  description: string;
};

export const shows: Show[] = [
  {
    id: "hamlet",
    title: "هملت، شاهزاده دانمارک",
    director: "داریوش مهرجویی",
    date: "۲۸ مرداد ۱۴۰۵",
    time: "۲۰:۳۰",
    hall: "سالن اصلی — تئاتر شهر",
    price: 350000,
    seatsLeft: 42,
    totalSeats: 320,
    duration: "۱۴۵ دقیقه",
    genre: "تراژدی",
    rating: 4.8,
    description:
      "اجرایی مدرن از تراژدی جاودانهٔ شکسپیر؛ روایتی از انتقام، جنون و سرنوشت.",
  },
  {
    id: "seller",
    title: "مرگ فروشنده",
    director: "علی رفیعی",
    date: "۳ شهریور ۱۴۰۵",
    time: "۱۹:۰۰",
    hall: "سالن قشقایی — تئاتر شهر",
    price: 280000,
    seatsLeft: 12,
    totalSeats: 240,
    duration: "۱۲۰ دقیقه",
    genre: "درام",
    rating: 4.6,
    description:
      "بر اساس نمایشنامهٔ آرتور میلر؛ حکایتی تکان‌دهنده از رؤیاها، خانواده و خیانت.",
  },
  {
    id: "rhinoceros",
    title: "کرگدن‌ها",
    director: "محمدعلی باسطی",
    date: "۱۱ شهریور ۱۴۰۵",
    time: "۱۸:۰۰",
    hall: "سالن سایه — فرهنگسرا نیاوران",
    price: 220000,
    seatsLeft: 0,
    totalSeats: 180,
    duration: "۱۰۰ دقیقه",
    genre: "آبسورد",
    rating: 4.4,
    description:
      "از نمایشنامهٔ اژن یونسکو؛ طنزی تاریک دربارهٔ هم‌رنگی با جماعت و فروپاشی فردیت.",
  },
  {
    id: "veil",
    title: "پرده‌نشین‌ها",
    director: "کیومرث پوراحمد",
    date: "۱۹ شهریور ۱۴۰۵",
    time: "۲۱:۰۰",
    hall: "سالن استاد سهراب — تالار وحدت",
    price: 400000,
    seatsLeft: 88,
    totalSeats: 400,
    duration: "۱۳۰ دقیقه",
    genre: "تاریخی",
    rating: 4.9,
    description:
      "روایتی تاریخی از پشت پرده‌های دربار؛ نمایشی پرشور از قدرت، راز و عشق.",
  },
];

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)]!);
}

export function formatPrice(toman: number): string {
  return toPersianNumber(toman.toLocaleString("en-US"));
}
