import * as React from "react";
import { useMemo, useState } from "react";

type Entry = { id: string; name: string; submittedAt: string };
type Ranked = Entry & { rank: number; points: number };

export function StandingsTable({
  entries,
  updatedAt,
}: {
  entries: Entry[];
  updatedAt?: Date | string;
}) {
  const [q, setQ] = useState("");

  // Sort ascending by points → name (so rank 1 at top)
  const ranked: Ranked[] = useMemo(() => {
    return [...entries]
      .map((e, i) => ({ ...e, points: 0, rank: i + 1 }))
      .sort((a, b) => a.rank - b.rank);
  }, [entries]);

  const filtered = useMemo(
    () =>
      q.trim()
        ? ranked.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
        : ranked,
    [ranked, q]
  );

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mx-auto max-w-5xl mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wider text-white/50">
          Last updated:{" "}
          {updatedAt
            ? new Date(updatedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-5xl overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
        <div className="min-w-[680px]">
          {/* Header row aligned with columns */}
          <div className="flex items-center justify-between px-6 py-2.5 text-[11px] uppercase tracking-wider text-white/60 bg-white/[0.06] sticky top-0 z-10">
            <div className="w-[60px] shrink-0">Rank</div>
            <div className="flex-1">Player</div>
            <div className="w-[100px] shrink-0 text-right">Points</div>
          </div>

          {/* Body */}
          <ul className="max-h-[520px] overflow-y-auto">
            {filtered.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-6 py-3 border-t border-white/10
                           odd:bg-white/[0.025] even:bg-white/[0.05] hover:bg-white/[0.08]
                           transition-colors duration-150"
              >
                {/* Rank */}
                <div className="w-[60px] shrink-0 flex justify-start">
                  <span
                    className={[
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                      e.rank === 1
                        ? "bg-yellow-500/20 text-yellow-300"
                        : e.rank === 2
                        ? "bg-slate-300/15 text-slate-200"
                        : e.rank === 3
                        ? "bg-amber-700/20 text-amber-300"
                        : "bg-white/10 text-white/80",
                    ].join(" ")}
                  >
                    {e.rank}
                  </span>
                </div>

                {/* Player */}
                <div className="flex-1 truncate font-semibold text-[15px]">{e.name}</div>

                {/* Points */}
                <div className="w-[100px] shrink-0 text-right font-extrabold tabular-nums text-white/90">
                  {e.points.toLocaleString()}
                </div>
              </li>

            ))}

            {!filtered.length && (
              <li className="px-5 py-12 text-center text-white/60">No entries found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
