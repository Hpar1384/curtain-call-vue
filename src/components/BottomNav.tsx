import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "خانه", icon: "home" as const },
  { to: "/tickets", label: "بلیت‌ها", icon: "ticket" as const },
  { to: "/profile", label: "پروفایل", icon: "user" as const },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-border bg-background/95 backdrop-blur-xl">
      <ul className="flex items-stretch">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="group flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors data-[status=active]:text-gold"
            >
              <NavIcon name={item.icon} />
              <span className="text-[11px] font-bold">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function NavIcon({ name }: { name: "home" | "ticket" | "user" }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    );
  }
  if (name === "ticket") {
    return (
      <svg {...common}>
        <path d="M3 9V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6Z" />
        <path d="M14 6v12" strokeDasharray="2 3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
