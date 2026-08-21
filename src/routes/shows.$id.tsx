import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  MAX_TICKETS,
  MIN_TICKETS,
  formatPrice,
  getShowById,
  toPersianNumber,
} from "@/lib/shows";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { QuantityStepper } from "@/components/QuantityStepper";

export const Route = createFileRoute("/shows/$id")({
  loader: ({ params }) => {
    const show = getShowById(params.id);
    if (!show) throw notFound();
    return { show };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "نمایش یافت نشد | TheaterReserve" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { show } = loaderData;
    return {
      meta: [
        { title: `${show.title} | TheaterReserve` },
        { name: "description", content: show.description },
        { property: "og:title", content: `${show.title} | TheaterReserve` },
        { property: "og:description", content: show.description },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: ShowDetail,
});

function ShowDetail() {
  const { show } = Route.useLoaderData();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(MIN_TICKETS);
  const soldOut = show.availableSeats === 0;
  const max = Math.min(MAX_TICKETS, show.availableSeats || MIN_TICKETS);
  const total = show.price * quantity;

  return (
    <AppScreen
      title={show.title}
      back={
        <Link to="/" aria-label="بازگشت" className={backButtonClass}>
          <BackIcon />
        </Link>
      }
    >
      <img
        src={show.poster}
        alt={`پوستر نمایش ${show.title}`}
        width={768}
        height={1024}
        className="h-64 w-full object-cover"
      />

      <div className="space-y-5 px-5 pb-40 pt-5">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">{show.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {show.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Fact label="تاریخ" value={show.date} />
          <Fact label="ساعت" value={show.time} />
          <Fact label="مدت" value={show.duration} />
          <Fact label="رده سنی" value={show.ageRating} />
          <Fact label="سالن" value={show.venue} wide />
        </div>

        <div className="rounded-2xl bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">صندلی باقی‌مانده: </span>
          <span className="font-bold text-foreground">
            {soldOut ? "تکمیل ظرفیت" : toPersianNumber(show.availableSeats)}
          </span>
        </div>

        {!soldOut && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">تعداد بلیت</p>
            <QuantityStepper
              value={quantity}
              min={MIN_TICKETS}
              max={max}
              onChange={setQuantity}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">قیمت هر بلیت</span>
              <span className="text-foreground">
                {formatPrice(show.price)} تومان
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-extrabold">
              <span className="text-foreground">مبلغ قابل پرداخت</span>
              <span className="text-gold">{formatPrice(total)} تومان</span>
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
        <button
          type="button"
          disabled={soldOut}
          onClick={() =>
            navigate({
              to: "/booking/$showId",
              params: { showId: show.id },
              search: { qty: quantity },
            })
          }
          className="h-14 w-full rounded-2xl bg-primary text-base font-extrabold text-primary-foreground transition-transform active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground"
        >
          {soldOut ? "تکمیل ظرفیت" : "ادامه رزرو"}
        </button>
      </div>
    </AppScreen>
  );
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl bg-card px-4 py-3 " + (wide ? "col-span-2" : "")
      }
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
