// Team color themes. Calgary is pre-seeded from the colors you gave me;
// every other team can get its own set the same way (via prisma/seed.ts or
// the Settings tab once it exists) and the UI just reads whichever team is
// currently selected as "controlling."

export type TeamTheme = {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
};

export const DEFAULT_THEME: TeamTheme = {
  primary: "#B66A3C",
  secondary: "#4A2E3A",
  tertiary: "#F2E6D2",
  accent: "#804F55",
};

// Keyed by StatsPlus team_id once you know Calgary's — placeholder key
// "CALGARY" is used until that's wired up from /teams.
export const TEAM_THEMES: Record<string, TeamTheme> = {
  CALGARY: DEFAULT_THEME,
};

export function themeToCssVars(theme: TeamTheme): Record<string, string> {
  return {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-tertiary": theme.tertiary,
    "--team-accent": theme.accent,
  };
}
