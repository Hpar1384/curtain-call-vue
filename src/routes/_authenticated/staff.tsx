import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { checkStaffAccess } from "@/modules/checkin/checkin.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "ورود به سالن | پرسنل" },
      {
        name: "description",
        content: "اپ پرسنل تئاتر برای اسکن کد QR بلیت و ثبت ورود تماشاگران.",
      },
      { property: "og:title", content: "ورود به سالن | پرسنل" },
      { property: "og:description", content: "اسکن بلیت و ثبت ورود در ورودی سالن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffLayout,
});

function StaffLayout() {
  const { data, isPending, error } = useQuery({
    queryKey: ["can-checkin"],
    queryFn: () => checkStaffAccess(),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Staff gets its own installable experience that starts at /staff.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.href;
    link.href = "/staff.webmanifest";
    return () => {
      link.href = previous;
    };
  }, []);

  if (isPending) {
    return <p className="p-8 text-sm text-muted-foreground">در حال بررسی دسترسی…</p>;
  }

  if (error || !data?.canCheckin) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-bold text-foreground">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          این بخش فقط برای پرسنل ورودی سالن است.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-gold">
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#0b0b10]">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <span className="text-sm font-extrabold text-white">ورود به سالن</span>
        {pathname !== "/staff" ? (
          <Link to="/staff" className="text-xs font-bold text-white/60">
            داشبورد
          </Link>
        ) : (
          <Link to="/staff/checkin" className="text-xs font-bold text-gold">
            اسکن بلیت
          </Link>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
