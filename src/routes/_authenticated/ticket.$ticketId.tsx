import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cancelMyTicket, getMyTicket } from "@/lib/payment.functions";
import { ticketStatusLabel } from "@/lib/payment-types";
import { posterFor } from "@/lib/booking-ui";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { QrCode } from "@/components/QrCode";

const ticketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["my-ticket", id],
    queryFn: () => getMyTicket({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/ticket/$ticketId")({
  loader: async ({ params, context }) => {
    const ticket = await context.queryClient.ensureQueryData(
      ticketQueryOptions(params.ticketId),
    );
    if (!ticket) throw notFound();
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت بلیت: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">بلیت یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "بلیت دیجیتال | TheaterReserve" },
      {
        name: "description",
        content: "بلیت دیجیتال تئاتر همراه با کد QR، شمارهٔ صندلی و وضعیت بلیت.",
      },
      { property: "og:title", content: "بلیت دیجیتال | TheaterReserve" },
      { property: "og:description", content: "بلیت دیجیتال با کد QR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketScreen,
});

function TicketScreen() {
  const { ticketId } = Route.useParams();
  const { data } = useSuspenseQuery(ticketQueryOptions(ticketId));
  const t = data!;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cancelMyTicket({ data: { id: ticketId } });
      await queryClient.invalidateQueries({ queryKey: ["my-ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success("بلیت لغو شد و صندلی آزاد شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "لغو بلیت انجام نشد");
    }
    setBusy(false);
  };

  return (
    <AppScreen
      title="بلیت دیجیتال"
      back={
        <Link to="/tickets" aria-label="بازگشت" className={backButtonClass}>
          <BackIcon />
        </Link>
      }
    >
      <div className="space-y-4 px-5 pb-28 pt-5">
        <div className="flex flex-col items-center rounded-2xl bg-card p-5">
          <QrCode value={t.qrPayload} size={196} />
          <p className="mt-3 text-xs text-muted-foreground">کد بلیت</p>
          <p className="text-base font-extrabold text-gold" dir="ltr">
            {t.code}
          </p>
          <span
            className={
              "mt-3 rounded-full px-3 py-1 text-[11px] font-bold " +
              (t.status === "valid"
                ? "bg-gold-soft text-gold"
                : "bg-secondary text-muted-foreground")
            }
          >
            {ticketStatusLabel(t.status)}
          </span>
        </div>

        <div className="flex gap-3 rounded-2xl bg-card p-3">
          <img
            src={posterFor(t.posterKey)}
            alt={`پوستر نمایش ${t.showTitle}`}
            loading="lazy"
            className="h-24 w-16 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {t.showTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{t.venue}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.weekday} {t.date} · {t.time}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">صندلی: {t.seat}</p>
          </div>
        </div>

        {t.status === "valid" && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="w-full rounded-2xl bg-secondary py-3.5 text-sm font-extrabold text-destructive disabled:opacity-50"
          >
            {busy ? "در حال لغو…" : "لغو بلیت"}
          </button>
        )}
      </div>
    </AppScreen>
  );
}
