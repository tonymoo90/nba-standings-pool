import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Row = {
  conference: "east" | "west";
  team_id: string;
  predicted_rank: number;
  weight: number;
  wins: number;
  points: number;
};

/**
 * Shows the detailed per-team scoring breakdown for one entry,
 * using the weighted-wins rule (15× wins for #15 ... 1× wins for #1).
 */
export default function EntryBreakdownWeighted({ entryId }: { entryId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ east: 0, west: 0, all: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("score_entry_weighted", { entry_id: entryId });
      if (error) {
        console.error("Error fetching breakdown:", error);
        setLoading(false);
        return;
      }
      const r = (data ?? []) as Row[];
      setRows(r);

      const east = r.filter(x => x.conference === "east").reduce((s, x) => s + x.points, 0);
      const west = r.filter(x => x.conference === "west").reduce((s, x) => s + x.points, 0);
      setTotals({ east, west, all: east + west });
      setLoading(false);
    })();
  }, [entryId]);

  if (loading) {
    return <div className="p-6 text-white/70">Loading breakdown…</div>;
  }

  const Section = (conf: "east" | "west") => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold capitalize text-white/90">{conf}</h3>
        <span className="text-sm text-white/60">
          Points: {conf === "east" ? totals.east : totals.west}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full text-sm text-white/80">
          <thead className="text-left uppercase text-[11px] tracking-wider text-white/60 border-b border-white/10">
            <tr>
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Team</th>
              <th className="py-2 pr-3">Weight</th>
              <th className="py-2 pr-3">Wins</th>
              <th className="py-2 pr-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter(r => r.conference === conf)
              .map((r, idx) => (
                <tr key={conf + r.team_id} className="border-t border-white/5">
                  <td className="py-1 pr-3">{idx + 1}</td>
                  <td className="py-1 pr-3 font-medium">{r.team_id}</td>
                  <td className="py-1 pr-3">{r.weight}</td>
                  <td className="py-1 pr-3">{r.wins}</td>
                  <td className="py-1 pr-3 text-right font-semibold">{r.points}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Entry Breakdown</h2>
        <div className="text-lg font-bold text-white/90">Total: {totals.all}</div>
      </div>
      {Section("east")}
      {Section("west")}
    </div>
  );
}
