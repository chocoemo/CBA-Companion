"use client";

import { useEffect, useRef, useState } from "react";

type Result = { id: number; name: string; team: string; pos: string | null; level: string | null };

export default function SiteSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(() => {
      fetch(`/api/players/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => { setResults(data); setOpen(true); })
        .catch(() => setResults([]));
    }, 200); // debounce
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative", width: 220 }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search players…"
        style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "none", fontSize: 12.5 }}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: "#fff", borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", zIndex: 100, maxHeight: 320, overflowY: "auto" }}>
          {results.map((r) => (
            <a
              key={r.id}
              href={`/players/${r.id}`}
              style={{ display: "block", padding: "7px 10px", fontSize: 12.5, color: "#222", textDecoration: "none", borderBottom: "1px solid #eee" }}
              onClick={() => setOpen(false)}
            >
              <b>{r.name}</b> <span style={{ opacity: 0.6 }}>· {r.team} · {r.pos ?? "—"} · {r.level ?? "—"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
