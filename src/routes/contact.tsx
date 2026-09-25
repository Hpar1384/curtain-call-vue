import { createFileRoute } from "@tanstack/react-router";
import { InfoScreen, ActionRow, VENUE } from "@/components/InfoScreen";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تماس با ما | Curtain Call" },
      { name: "description", content: "تلفن، ایمیل، شبکه‌های اجتماعی و آدرس Curtain Call." },
      { property: "og:title", content: "تماس با ما | Curtain Call" },
      { property: "og:description", content: "راه‌های ارتباط با Curtain Call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <InfoScreen title="تماس با ما">
      <ActionRow href="#" icon="📞" label="تلفن" value={VENUE.phone} />
      <ActionRow href="#" icon="✉️" label="ایمیل" value={VENUE.email} />
      <ActionRow href="#" icon="📸" label="اینستاگرام" value="لینک شبکه اجتماعی" />
      <ActionRow href="#" icon="✈️" label="تلگرام" value="لینک شبکه اجتماعی" />
      <ActionRow href={VENUE.mapUrl} icon="📍" label="آدرس و مسیریابی" value={VENUE.address} />
    </InfoScreen>
  );
}
