"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_TABS = [
  { href: "/", label: "Team", live: true, match: (p: string) => p === "/" },
  { href: "/draft", label: "Draft", live: true, match: (p: string) => p.startsWith("/draft") },
  { href: "/league", label: "League", live: true, match: (p: string) => p.startsWith("/league") },
  { href: "/international", label: "International", live: true, match: (p: string) => p.startsWith("/international") },
  { href: "/settings", label: "Settings", live: true, match: (p: string) => p.startsWith("/settings") },
  { href: "#", label: "Trade Calc", live: false, match: () => false },
  { href: "#", label: "Pick Value Chart", live: false, match: () => false },
  { href: "#", label: "GM Tendencies", live: false, match: () => false },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="tabs">
      {MAIN_TABS.map((t) =>
        t.live ? (
          <Link key={t.label} href={t.href}>
            <button className={t.match(pathname) ? "active" : ""}>{t.label}</button>
          </Link>
        ) : (
          <button key={t.label} disabled title="Coming in a later phase" style={{ opacity: 0.4, cursor: "not-allowed" }}>
            {t.label}
          </button>
        )
      )}
    </nav>
  );
}
