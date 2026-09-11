"use client";
import PlayerTable from "@/app/components/PlayerTable";

export default function InternationalPage() {
  return (
    <div>
      <p style={{ opacity: 0.75, marginBottom: 12, fontSize: 12.5 }}>
        Players in leagues not affiliated with any CBA org — potential bidding/FA targets.
        Leagues default to unclassified until confirmed in Settings, so this list starts
        empty until at least one league is marked "not CBA-affiliated."
      </p>
      <PlayerTable pool="international" columns="roster" />
    </div>
  );
}
