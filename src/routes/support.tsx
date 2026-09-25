import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { InfoScreen, InfoCard } from "@/components/InfoScreen";
import { PrimaryButton } from "@/components/StickyBar";
import { formatPrice } from "@/lib/shows";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "حمایت از ما | Curtain Call" },
      { name: "description", content: "از تئاتر مستقل حمایت کنید." },
      { property: "og:title", content: "حمایت از ما | Curtain Call" },
      { property: "og:description", content: "از تئاتر مستقل حمایت کنید." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Support,
});

const AMOUNTS = [50000, 100000, 250000, 500000];

function Support() {
  const [amount, setAmount] = useState(AMOUNTS[1]);
  return (
    <InfoScreen title="حمایت از ما">
      <InfoCard title="همراه تئاتر باشید">
        حمایت شما به تولید نمایش‌های تازه و نگهداری سالن کمک می‌کند.
      </InfoCard>
      <div className="grid grid-cols-2 gap-3">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={
              "h-14 rounded-2xl text-sm font-extrabold transition-colors " +
              (a === amount ? "bg-primary text-primary-foreground" : "bg-card text-foreground")
            }
          >
            {formatPrice(a)} تومان
          </button>
        ))}
      </div>
      <PrimaryButton disabled>پرداخت حمایت (به‌زودی)</PrimaryButton>
      <p className="text-center text-xs text-muted-foreground">امکان پرداخت حمایت به‌زودی فعال می‌شود.</p>
    </InfoScreen>
  );
}
