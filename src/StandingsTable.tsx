import * as React from "react";
import { useMemo, useState } from "react";

type Entry = {
  id: string;
  name: string;
  userId?: string; // make sure you pass this in
  points: number;
  submittedAt?: string;
};

type Ranked = Entry & { rank: number };

// at the top: extend props
export function StandingsTable({
  entries,
  updatedAt,
  currentUserId,
  onOpenEntry,                 // ← add
}: {
  entries: Entry[];
  updatedAt?: Date | string;
  currentUserId?: string;
  onOpenEntry?: (entryId: string) => void; // ← add
}) {


  const [q, setQ] = useState("");

  // Rank: points DESC, then name ASC; assign rank numbers
  const ranked: Ranked[] = useMemo(() => {
    return [...entries]
      .sort(
        (a, b) =>
          (b.points ?? 0) - (a.points ?? 0) ||
          a.name.localeCompare(b.name)
      )
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries]);

  const filtered = useMemo(
    () =>
      q.trim()
        ? ranked.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
        : ranked,
    [ranked, q]
  );

  // ✅ return begins here
  return (
    <div className="w-full">
      {/* Top bar */}
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

        {/* Optional quick search */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="search-input"
        />
      </div>

      {/* Card */}
      {/* Card */}
      <div className="mx-auto max-w-5xl overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
        {/* keep a minimum width so columns never collapse */}
        <div className="min-w-[720px]">
          {/* Header */}
          <div className="grid grid-cols-12 items-center px-6 py-2.5 text-[11px] uppercase tracking-wider text-white/60 bg-white/[0.06] sticky top-0 z-10">
            <div className="col-span-1">Rank</div>
            <div className="col-span-8">Player</div>
            <div className="col-span-2 text-right">Points</div>
            <div className="col-span-1 text-right"></div> {/* View */}
          </div>

          {/* Body */}
          <ul className="max-h-[520px] overflow-y-auto">
            {filtered.map((e) => {
              const isMe = currentUserId && e.userId === currentUserId;
              return (
                <li
                  key={e.id}
                  aria-current={isMe ? "true" : undefined}
                  className="
                    grid grid-cols-12 items-center px-6 py-3 border-t border-white/10
                    transition-colors duration-150
                    odd:bg-white/[0.025] even:bg-white/[0.05] hover:bg-white/[0.08]
                    aria-[current=true]:!bg-emerald-500/15
                    aria-[current=true]:ring-1 aria-[current=true]:ring-emerald-400/30
                  "
                >
                  {/* Rank */}
                  <div className="col-span-1">
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
                  <div className="col-span-8 truncate font-semibold text-[15px]">
                    {e.name}
                    {isMe && (
                      <span className="ml-2 align-[2px] rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        You
                      </span>
                    )}
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-right font-extrabold tabular-nums text-white/90">
                    {(e.points ?? 0).toLocaleString()}
                  </div>

                  {/* View */}
                  <div className="col-span-1 text-right">
                    {onOpenEntry && (
                      <button
                        onClick={() => onOpenEntry(e.id)}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 transition"
                      >
                        View
                      </button>
                    )}
                  </div>
                </li>
              );
            })}

            {!filtered.length && (
              <li className="px-5 py-12 text-center text-white/60">No entries found.</li>
            )}
          </ul>
        </div>
      </div>

          </div>
        );
      }
