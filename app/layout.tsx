import "./globals.css";
import { DEFAULT_THEME, themeToCssVars } from "@/lib/theme";

export const metadata = {
  title: "CBA Companion",
  description: "Org management, draft, and trade companion for the Championship Baseball Association",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Phase 2 will make this dynamic (team switcher). For now Calgary's theme
  // is the default, matching the "controlling team" concept from the spec.
  const vars = themeToCssVars(DEFAULT_THEME);
  const styleVars = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  return (
    <html lang="en">
      <body style={{ ["--inline-vars" as any]: styleVars }}>
        <div style={styleVars as any}>{children}</div>
      </body>
    </html>
  );
}
