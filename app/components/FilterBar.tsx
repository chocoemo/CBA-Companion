"use client";

import { useState } from "react";

export type FilterOp = "gte" | "lte" | "eq" | "neq";
export type FilterRule = { id: string; field: string; op: FilterOp; value: number };
export type PosTypeFilter = "all" | "hitters" | "pitchers";

// Every field a rule can target. "pos_X" reads from tools.positionRatings.X;
// everything else reads from top-level player fields or tools.<field>.
export const FILTER_FIELDS: { value: string; label: string }[] = [
  { value: "age", label: "Age" },
  { value: "overall", label: "Overall" },
  { value: "potential", label: "Potential" },
  { value: "contact", label: "Contact" },
  { value: "power", label: "Power" },
  { value: "eye", label: "Eye" },
  { value: "babip", label: "BABIP" },
  { value: "gap", label: "Gap" },
  { value: "speed", label: "Speed" },
  { value: "steal", label: "Steal" },
  { value: "stuff", label: "Stuff" },
  { value: "control", label: "Control" },
  { value: "movement", label: "Movement" },
  { value: "stamina", label: "Stamina" },
  { value: "holdRunners", label: "Hold Runners" },
  { value: "pos_C", label: "Fit: C" },
  { value: "pos_1B", label: "Fit: 1B" },
  { value: "pos_2B", label: "Fit: 2B" },
  { value: "pos_3B", label: "Fit: 3B" },
  { value: "pos_SS", label: "Fit: SS" },
  { value: "pos_LF", label: "Fit: LF" },
  { value: "pos_CF", label: "Fit: CF" },
  { value: "pos_RF", label: "Fit: RF" },
];

const OP_LABELS: Record<FilterOp, string> = { gte: "at least", lte: "at most", eq: "is", neq: "is not" };

export function getFilterFieldValue(
  field: string,
  player: { age: number | null },
  block: { overall: number | null; potential: number | null; tools: Record<string, any> } | null | undefined
): number | null {
  if (field === "age") return player.age;
  if (field === "overall") return block?.overall ?? null;
  if (field === "potential") return block?.potential ?? null;
  if (field.startsWith("pos_")) {
    const pos = field.slice(4);
    const v = block?.tools?.positionRatings?.[pos];
    return typeof v === "number" ? v : null;
  }
  const v = block?.tools?.[field];
  return typeof v === "number" ? v : null;
}

export function ruleMatches(value: number | null, op: FilterOp, target: number): boolean {
  if (value === null) return false;
  switch (op) {
    case "gte": return value >= target;
    case "lte": return value <= target;
    case "eq": return value === target;
    case "neq": return value !== target;
  }
}

export default function FilterBar({
  posType, onPosTypeChange, rules, onRulesChange,
}: {
  posType: PosTypeFilter;
  onPosTypeChange: (p: PosTypeFilter) => void;
  rules: FilterRule[];
  onRulesChange: (r: FilterRule[]) => void;
}) {
  function addRule() {
    onRulesChange([...rules, { id: `${Date.now()}`, field: "overall", op: "gte", value: 50 }]);
  }
  function updateRule(id: string, patch: Partial<FilterRule>) {
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRule(id: string) {
    onRulesChange(rules.filter((r) => r.id !== id));
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e7f0", borderRadius: 8, padding: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: rules.length ? 8 : 0 }}>
        {(["all", "hitters", "pitchers"] as PosTypeFilter[]).map((pt) => (
          <button
            key={pt}
            onClick={() => onPosTypeChange(pt)}
            style={{
              background: posType === pt ? "var(--team-accent)" : "var(--team-tertiary)",
              color: posType === pt ? "#fff" : "var(--team-secondary)",
              border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            {pt === "all" ? "All players" : pt === "hitters" ? "Hitters only" : "Pitchers only"}
          </button>
        ))}
        <button
          onClick={addRule}
          style={{ marginLeft: "auto", background: "var(--team-secondary)", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          + Add filter
        </button>
      </div>

      {rules.map((rule) => (
        <div key={rule.id} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
          <select value={rule.field} onChange={(e) => updateRule(rule.id, { field: e.target.value })} style={{ fontSize: 12, padding: 3 }}>
            {FILTER_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={rule.op} onChange={(e) => updateRule(rule.id, { op: e.target.value as FilterOp })} style={{ fontSize: 12, padding: 3 }}>
            {(Object.keys(OP_LABELS) as FilterOp[]).map((op) => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
          </select>
          <input
            type="number" value={rule.value} style={{ width: 64, fontSize: 12, padding: 3 }}
            onChange={(e) => updateRule(rule.id, { value: Number(e.target.value) })}
          />
          <button onClick={() => removeRule(rule.id)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      ))}
    </div>
  );
}
