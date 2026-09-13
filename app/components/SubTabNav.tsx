"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubTabNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href}>
            <button
              style={{
                background: active ? "var(--team-accent)" : "var(--team-tertiary)",
                color: active ? "#fff" : "var(--team-secondary)",
                border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
              }}
            >
              {t.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}
