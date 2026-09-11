import Link from "next/link";
import BigBoardPage from "./big-board/page";

const PHASE_1_TABS = [
  { href: "/", label: "Big Board", live: true },
  { label: "Draft Log", live: false },
  { label: "Org Depth", live: false },
  { label: "Trade Calc", live: false },
  { label: "Pick Value Chart", live: false },
  { label: "GM Tendencies", live: false },
  { label: "Settings", live: false },
];

export default function Home() {
  return (
    <>
      <header className="app-header">
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>CBA Companion</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Calgary — controlling team</div>
        </div>
      </header>
      <nav className="tabs">
        {PHASE_1_TABS.map((t) =>
          t.live ? (
            <Link key={t.label} href={t.href!}>
              <button className="active">{t.label}</button>
            </Link>
          ) : (
            <button key={t.label} disabled title="Coming in a later phase" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              {t.label}
            </button>
          )
        )}
      </nav>
      <main>
        <BigBoardPage />
      </main>
    </>
  );
}
