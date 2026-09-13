import SubTabNav from "@/app/components/SubTabNav";

const TABS = [
  { href: "/draft", label: "Big Board" },
  { href: "/draft/log", label: "Draft Log" },
  { href: "/draft/power-speed", label: "Power/Speed" },
];

export default function DraftLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav tabs={TABS} />
      {children}
    </div>
  );
}
