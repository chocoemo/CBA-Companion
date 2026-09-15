// StatsPlus only gives a 1/0 college flag, no school name — so "HS" vs
// "College" is as specific as this can ever get from /draftv2's data.
export function classLabel(isCollege: boolean | null | undefined): string {
  if (isCollege === null || isCollege === undefined) return "—";
  return isCollege ? "College" : "HS";
}
