// StatsPlus sends streak as a plain signed int (positive = win streak,
// negative = loss streak) — this is an inferred convention, not confirmed
// against a documented spec, but matches the sign pattern seen live.
export function formatStreak(streak: number | null): string {
  if (streak === null || streak === undefined) return "—";
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "—";
}
