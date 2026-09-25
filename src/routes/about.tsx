import { createFileRoute } from "@tanstack/react-router";
import { InfoScreen, InfoCard, ActionRow, VENUE } from "@/components/InfoScreen";
import hamlet from "@/assets/poster-hamlet.jpg";
import veil from "@/assets/poster-veil.jpg";
import seller from "@/assets/poster-seller.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "درباره ما | Curtain Call" },
      { name: "description", content: "معرفی مجموعه، سالن‌ها و ساعات کاری Curtain Call." },
      { property: "og:title", content: "درباره ما | Curtain Call" },
      { property: "og:description", content: "معرفی مجموعه و سالن‌های Curtain Call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <InfoScreen title="درباره ما">
      <InfoCard title="معرفی مجموعه">
        Curtain Call مجموعه‌ای برای اجرای نمایش‌های صحنه‌ای است که تلاش می‌کند تجربهٔ تماشای
        تئاتر را ساده، در دسترس و به‌یادماندنی کند.
      </InfoCard>
      <div className="grid grid-cols-3 gap-2">
        {[hamlet, veil, seller].map((src, i) => (
          <img key={i} src={src} alt="تصویر سالن و اجرا" loading="lazy" className="aspect-[3/4] w-full rounded-xl object-cover" />
        ))}
      </div>
      <InfoCard title="سالن">
        {VENUE.name}
        <br />
        {VENUE.address}
      </InfoCard>
      <InfoCard title="ساعات کاری">
        <ul className="space-y-1.5">
          {VENUE.hours.map(([d, h]) => (
            <li key={d} className="flex justify-between">
              <span>{d}</span>
              <span className="font-bold text-foreground">{h}</span>
            </li>
          ))}
        </ul>
      </InfoCard>
      <ActionRow href={VENUE.mapUrl} icon="📍" label="مسیریابی تا سالن" value="باز کردن در نقشه" />
    </InfoScreen>
  );
}
