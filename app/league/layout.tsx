import SubTabNav from "@/app/components/SubTabNav";

const TABS = [
  { href: "/league", label: "Free Agents" },
  { href: "/league/players", label: "Players" },
  { href: "/league/standings", label: "Standings" },
];

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav tabs={TABS} />
      {children}
    </div>
  );
}
