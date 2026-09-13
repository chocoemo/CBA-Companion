import "./globals.css";
import { DEFAULT_THEME, themeToCssVars } from "@/lib/theme";
import TabNav from "@/app/components/TabNav";

export const metadata = {
  title: "CBA Companion",
  description: "Org management, draft, and trade companion for the Championship Baseball Association",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Phase-later: team switcher. Calgary's theme is the default for now.
  const vars = themeToCssVars(DEFAULT_THEME) as React.CSSProperties;

  return (
    <html lang="en">
      <body style={vars}>
        <header className="app-header">
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>CBA Companion</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Calgary — controlling team</div>
          </div>
        </header>
        <TabNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
