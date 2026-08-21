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
  image: string;
  description: string;
};

export const shows: Show[] = [
  {
    id: "hamlet",
    title: "هملت، شاهزاده دانمارک",
    director: "کارگردان: داریush مهرجویی",
    date: "۲۸ مرداد ۱۴۰۵",
    time: "۲۰:۳۰",
    hall: "سالن اصلی - تئاتر شهر",
    price: 350000,
    seatsLeft: 42,
    totalSeats: 320,
    duration: "۱۴۵ دقیقه",
    genre: "تراژدی",
    rating: 4.8,
    image: "hamlet.jpg",
    description:
      "اجرای مدرن از تراژدی бессмерт اثر شکسپیر؛ روایتی از انتقام، جنون و سرنوشت.",
  },
  {
    id: "seller",
    title: "کاشفه فروش",
    director: "کارگردان: علی رفیعی",
    date: "۳ شهریور ۱۴۰۵",
    time: "۱۹:۰۰",
    hall: "سالن قشقایی - تئاتر شهر",
    price: 280000,
    seatsLeft: 12,
    totalSeats: 240,
    duration: "۱۲۰ دقیقه",
    genre: "درام",
    rating: 4.6,
    image: "seller.jpg",
    description:
      "بر اساس نمایشنامه آرتور میلر؛ حکایتی تکان‌دهنده از رؤیاها، خانواده و خیانت.",
  },
  {
    id: "rhinoceros",
    title: "کرگدن‌ها",
    director: "کارگردان: محمّدعلی باسطی",
    date: "۱۱ شهریور ۱۴۰۵",
    time: "۱۸:۰۰",
    hall: "سالن سایه - فرهنگسرا نیاوران",
    price: 220000,
    seatsLeft: 0,
    totalSeats: 180,
    duration: "۱۰۰ دقیقه",
    genre: "آبسورد",
    rating: 4.4,
    image: "rhinoceros.jpg",
    description:
      "از نمایشنامه اژن یونسکو؛ طنز تاریکی درباره همرنگی با جماعت و فروپاشی فردیت.",
  },
  {
    id: "veil",
    title: "پرده‌نشین‌ها",
    director: "کارگردان: کیومرث پوراحمد",
    date: "۱۹ شهریور ۱۴۰۵",
    time: "۲۱:۰۰",
    hall: "سالن استاد سهراب - تالار وحدت",
    price: 400000,
    seatsLeft: 88,
    totalSeats: 400,
    duration: "۱۳۰ دقیقه",
    genre: "تاریخی",
    rating: 4.9,
    image: "veil.jpg",
    description:
      "روایتی تاریخی از پشت پرده‌های دربار؛ نمایشی پرفاز از قدرت، راز و عشق.",
  },
];
