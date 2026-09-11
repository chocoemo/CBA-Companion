import "./globals.css";
import { DEFAULT_THEME, themeToCssVars } from "@/lib/theme";

export const metadata = {
  title: "CBA Companion",
  description: "Org management, draft, and trade companion for the Championship Baseball Association",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Phase 2 will make this dynamic (team switcher). For now Calgary's theme
  // is the default, matching the "controlling team" concept from the spec.
  // themeToCssVars() already returns a plain object ({ "--team-primary":
  // "#B66A3C", ... }) — React's `style` prop must be an object, never a
  // string, so we apply that object directly instead of joining it into a
  // "key:value;key:value" string first.
  const vars = themeToCssVars(DEFAULT_THEME) as React.CSSProperties;

  return (
    <html lang="en">
      <body style={vars}>{children}</body>
    </html>
  );
}
