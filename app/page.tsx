"use client";
import { useState } from "react";
import DraftPage from "./draft/page";
import LeaguePage from "./league/page";
import InternationalPage from "./international/page";
import TeamPage from "./team/page";
import SettingsPage from "./settings/page";

const MAIN_TABS = [
  { key: "draft", label: "Draft", live: true },
  { key: "league", label: "League", live: true },
  { key: "international", label: "International", live: true },
  { key: "team", label: "Team", live: true },
  { key: "settings", label: "Settings", live: true },
  { key: "trade", label: "Trade Calc", live: false },
  { key: "picks", label: "Pick Value Chart", live: false },
  { key: "gm", label: "GM Tendencies", live: false },
] as const;

export default function Home() {
  const [tab, setTab] = useState<(typeof MAIN_TABS)[number]["key"]>("draft");

  return (
    <>
      <header className="app-header">
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>CBA Companion</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Calgary — controlling team</div>
        </div>
      </header>
      <nav className="tabs">
        {MAIN_TABS.map((t) =>
          t.live ? (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ) : (
            <button key={t.key} disabled title="Coming in a later phase" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              {t.label}
            </button>
          )
        )}
      </nav>
      <main>
        {tab === "draft" && <DraftPage />}
        {tab === "league" && <LeaguePage />}
        {tab === "international" && <InternationalPage />}
        {tab === "team" && <TeamPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </>
  );
}
