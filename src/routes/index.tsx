import { createFileRoute } from "@tanstack/react-router";
import { shows, toPersianNumber, formatPrice, type Show } from "@/lib/shows";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TheaterReserve | رزرو آنلاین بلیت تئاتر" },
      {
        name: "description",
        content:
          "سامانه رزرو آنلاین بلیت تئاتر؛ مشاهدهٔ نمایش‌های در حال اجرا و رزرو صندلی.",
      },
      { property: "og:title", content: "TheaterReserve | رزرو آنلاین بلیت تئاتر" },
      {
        property: "og:description",
        content:
          "سامانه رزرو آنلاین بلیت تئاتر؛ مشاهدهٔ نمایش‌های در حال اجرا و رزرو صندلی.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const navItems = [
  { label: "نمایش‌ها", href: "#shows" },
  { label: "سالن‌ها", href: "#halls" },
  { label: "درباره ما", href: "#about" },
  { label: "تماس", href: "#contact" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <main id="shows" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <SectionHeader />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Theater<span className="text-gold">Reserve</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
            ورود
          </button>
          <button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_24px_-6px_var(--gold)] transition-all hover:brightness-110">
            ثبت‌نام
          </button>
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-accent">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-primary-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* theater masks */}
        <path d="M4 4h16v3a4 4 0 0 1-8 0 4 4 0 0 1-8 0V4Z" />
        <path d="M4 4 2 2M20 4l2-2M12 11v9" />
      </svg>
    </span>
  );
}

function Hero() {
  return (
    <section className="hero-curtain relative overflow-hidden border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <span className="rounded-full border border-gold/40 bg-gold-soft px-4 py-1.5 text-xs font-semibold tracking-wide text-gold">
          فصل جدید تئاتر — تابستان ۱۴۰۵
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          صندلی خود را در{" "}
          <span className="text-glow text-gold">سالی که تاریک می‌شود</span>، روشن
          کن.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          TheaterReserve بزرگ‌ترین سامانهٔ رزرو آنلاین بلیت تئاتر است. نمایش‌های
          در حال اجرا را مرور کن، سالن و صندلی را انتخاب کن و بلیتت را در چند
          ثانیه رزرو کن.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#shows"
            className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_30px_-6px_var(--gold)] transition-all hover:brightness-110"
          >
            مشاهدهٔ نمایش‌ها
          </a>
          <a
            href="#halls"
            className="rounded-full border border-border px-7 py-3 text-sm font-bold text-foreground transition-colors hover:bg-card"
          >
            راهنمای سالن‌ها
          </a>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          {[
            { value: "+۱۲۰", label: "نمایش فعال" },
            { value: "+۴۵", label: "سالن همکار" },
            { value: "+۸۰هزار", label: "بلیت فروخته‌شده" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-extrabold text-gold">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex flex-col gap-3 py-12">
      <div className="flex items-center gap-2">
        <span className="h-px w-8 bg-gold" />
        <span className="text-xs font-semibold tracking-widest text-gold">
          در حال اجرا
        </span>
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        نمایش‌های تئاتر این هفته
      </h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        چهار نمایش منتخب از بهترین گروه‌های تئاتری شهر؛ برای دیدن جزئیات و رزرو
        صندلی روی کارت مورد نظر بزن.
      </p>
    </div>
  );
}

function ShowCard({ show }: { show: Show }) {
  const soldOut = show.seatsLeft === 0;
  const soldPercent = Math.round(
    ((show.totalSeats - show.seatsLeft) / show.totalSeats) * 100,
  );

  return (
    <article className="card-sheen group relative flex flex-col overflow-hidden rounded-2xl border border-border transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_50px_-20px_var(--gold)]">
      {/* Poster area */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-accent/40 via-card to-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,var(--spotlight),transparent_70%)]" />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-gold/40 bg-background/70 px-2.5 py-1 text-xs font-bold text-gold backdrop-blur">
          ★ {toPersianNumber(show.rating.toFixed(1))}
        </div>
        <span className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
          {show.genre}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-3">
          <span className="text-2xl font-black tracking-tight text-foreground/90 opacity-80">
            {show.title}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-bold leading-snug text-foreground">
            {show.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{show.director}</p>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {show.description}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow icon="calendar" label={show.date} />
          <InfoRow icon="clock" label={show.time} />
          <InfoRow icon="pin" label={show.hall} full />
        </div>

        {/* Seat meter */}
        <div className="mt-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">صندلی باقی‌مانده</span>
            <span
              className={
                soldOut
                  ? "font-bold text-destructive"
                  : show.seatsLeft <= 15
                    ? "font-bold text-accent-foreground"
                    : "font-bold text-foreground"
              }
            >
              {soldOut ? "تکمیل ظرفیت" : toPersianNumber(show.seatsLeft)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={
                "h-full rounded-full transition-all " +
                (soldOut
                  ? "bg-destructive/70"
                  : show.seatsLeft <= 15
                    ? "bg-accent"
                    : "bg-gold")
              }
              style={{ width: `${soldPercent}%` }}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="text-[11px] text-muted-foreground">شروع از</div>
            <div className="text-lg font-extrabold text-foreground">
              {formatPrice(show.price)}
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                تومان
              </span>
            </div>
          </div>
          <button
            disabled={soldOut}
            className={
              "rounded-full px-4 py-2 text-xs font-bold transition-all " +
              (soldOut
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:brightness-110")
            }
          >
            {soldOut ? "ناموجود" : "مشاهدهٔ جزئیات و رزرو"}
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoRow({
  icon,
  label,
  full,
}: {
  icon: "calendar" | "clock" | "pin";
  label: string;
  full?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 " +
        (full ? "col-span-2" : "")
      }
    >
      <Icon name={icon} />
      <span className="truncate text-muted-foreground">{label}</span>
    </div>
  );
}

function Icon({ name }: { name: "calendar" | "clock" | "pin" }) {
  const common = {
    className: "h-3.5 w-3.5 shrink-0 text-gold",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-border bg-background"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-extrabold text-foreground">
              Theater<span className="text-gold">Reserve</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            سامانهٔ رزرو آنلاین بلیت تئاتر؛ از نمایش تا صندلی، همه در یک کلیک.
          </p>
        </div>
        <div id="halls">
          <h4 className="text-sm font-bold text-foreground">دسترسی سریع</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div id="about">
          <h4 className="text-sm font-bold text-foreground">پشتیبانی</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>تلفن: ۰۲۱-۸۸۱۲۳۴۵۶</li>
            <li>ایمیل: info@theaterreserve.ir</li>
            <li>هر روز ۹ تا ۲۲</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5">
        <p className="text-center text-xs text-muted-foreground">
          © ۱۴۰۵ TheaterReserve — تمام حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

export default Index;
