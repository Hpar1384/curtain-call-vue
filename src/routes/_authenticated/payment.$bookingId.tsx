import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyBooking } from "@/lib/booking.functions";
import { payBooking } from "@/lib/payment.functions";
import type { PaymentOutcome } from "@/lib/payment-types";
import { formatPrice, toPersianNumber } from "@/lib/format";
import { posterFor } from "@/lib/booking-ui";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

const bookingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["my-booking", id],
    queryFn: () => getMyBooking({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/payment/$bookingId")({
  loader: async ({ params, context }) => {
    const booking = await context.queryClient.ensureQueryData(
      bookingQueryOptions(params.bookingId),
    );
    if (!booking) throw notFound();
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در مرحلهٔ پرداخت: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">رزرو یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "پرداخت رزرو | TheaterReserve" },
      {
        name: "description",
        content: "پرداخت آزمایشی بلیت تئاتر: مبلغ کل، صندلی‌ها و نتیجهٔ تراکنش.",
      },
      { property: "og:title", content: "پرداخت رزرو | TheaterReserve" },
      { property: "og:description", content: "مرحلهٔ پرداخت رزرو بلیت تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentScreen,
});

const modes: { value: PaymentOutcome; label: string; hint: string }[] = [
  { value: "success", label: "پرداخت موفق", hint: "رزرو تأیید و بلیت‌ها صادر می‌شوند" },
  { value: "failed", label: "پرداخت ناموفق", hint: "بلیتی صادر نمی‌شود" },
  { value: "cancelled", label: "انصراف از پرداخت", hint: "رزرو لغو و صندلی‌ها آزاد می‌شوند" },
];

function PaymentScreen() {
  const { bookingId } = Route.useParams();
  const { data } = useSuspenseQuery(bookingQueryOptions(bookingId));
  const booking = data!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PaymentOutcome>("success");
  const [paying, setPaying] = useState(false);

  const alreadyHandled = booking.status !== "awaiting_payment";

  const pay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const result = await payBooking({ data: { bookingId, simulate: mode } });
      await queryClient.invalidateQueries({ queryKey: ["my-booking", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      if (result.status === "success") {
        toast.success("پرداخت با موفقیت انجام شد");
        navigate({ to: "/confirmation/$bookingId", params: { bookingId } });
      } else {
        toast.error(
          result.status === "failed"
            ? "پرداخت ناموفق بود؛ بلیتی صادر نشد."
            : "پرداخت لغو شد؛ صندلی‌ها آزاد شدند.",
        );
        setPaying(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "پرداخت انجام نشد");
      setPaying(false);
    }
  };

  return (
    <AppScreen title="پرداخت">
      <div className="space-y-4 px-5 pb-40 pt-5">
        <div className="flex gap-3 rounded-2xl bg-card p-3">
          <img
            src={posterFor(booking.posterKey)}
            alt={`پوستر نمایش ${booking.showTitle}`}
            loading="lazy"
            className="h-24 w-16 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {booking.showTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{booking.venue}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {booking.weekday} {booking.date} · {booking.time}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              صندلی: {booking.seats.join("، ")} (
              {toPersianNumber(booking.seats.length)} بلیت)
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">مبلغ قابل پرداخت</span>
            <span className="font-extrabold text-gold">
              {formatPrice(booking.total)} تومان
            </span>
          </div>
        </div>

        {alreadyHandled ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">
            این رزرو دیگر در انتظار پرداخت نیست.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              درگاه آزمایشی — نتیجهٔ تراکنش را انتخاب کن
            </p>
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={
                  "flex w-full items-start justify-between gap-3 rounded-2xl border p-3.5 text-right transition-colors " +
                  (mode === m.value
                    ? "border-gold bg-gold-soft"
                    : "border-border bg-card")
                }
              >
                <span>
                  <span className="block text-sm font-extrabold text-foreground">
                    {m.label}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {m.hint}
                  </span>
                </span>
                <span
                  className={
                    "mt-1 h-4 w-4 shrink-0 rounded-full border-2 " +
                    (mode === m.value ? "border-gold bg-gold" : "border-border")
                  }
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <StickyBar>
        <PrimaryButton disabled={paying || alreadyHandled} onClick={pay}>
          {paying ? "در حال پرداخت…" : "پرداخت"}
        </PrimaryButton>
      </StickyBar>
    </AppScreen>
  );
}
