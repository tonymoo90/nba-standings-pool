import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Map ESPN => your TeamId (most match 1:1; these cover common edge cases)
const MAP: Record<string, string> = {
  // East
  ATL: "ATL", BOS: "BOS", BKN: "BKN", CHA: "CHA", CHI: "CHI",
  CLE: "CLE", DET: "DET", IND: "IND", MIA: "MIA", MIL: "MIL",
  NYK: "NYK", ORL: "ORL", PHI: "PHI", TOR: "TOR", WAS: "WAS",
  // West
  DAL: "DAL", DEN: "DEN", GSW: "GSW", HOU: "HOU", LAC: "LAC",
  LAL: "LAL", MEM: "MEM", MIN: "MIN", NOP: "NOP", OKC: "OKC",
  PHX: "PHX", POR: "POR", SAC: "SAC", SAS: "SAS", UTA: "UTA",
};

type WinsRow = { team_id: string; wins: number };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const handler: Handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) Fetch ESPN standings JSON
    const url = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";
    const res = await fetch(url, { headers: { "User-Agent": "nba-confidence/1.0" } });
    if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);
    const data = await res.json();

    // 2) Extract {team_id, wins}
    const rows: WinsRow[] = [];
    // ESPN structures can vary slightly; we search through "children"/"standings"/"entries"
    const containers = Array.isArray(data.children) ? data.children : [data];

    for (const block of containers) {
      const standings = block?.standings || block; // flexible
      const entries = standings?.entries || standings?.children?.[0]?.standings?.entries || [];

      for (const e of entries) {
        const abbr: string | undefined = e?.team?.abbreviation;
        if (!abbr) continue;
        const mapped = MAP[abbr];
        if (!mapped) continue;

        const winsStat = (e?.stats || []).find(
          (s: any) =>
            s?.name === "wins" ||
            s?.shortDisplayName === "W" ||
            s?.description === "Wins"
        );
        const wins = Number(winsStat?.value ?? winsStat?.displayValue ?? 0);
        rows.push({ team_id: mapped, wins: Number.isFinite(wins) ? wins : 0 });
      }
    }

    // Sanity: ensure we captured all 30 teams (if fewer, keep old values rather than wipe)
    if (rows.length < 26) {
      return {
        statusCode: 502,
        body: JSON.stringify({ ok: false, reason: "Too few rows from ESPN", count: rows.length }),
      };
    }

    // 3) Upsert into team_wins & append history (single round-trip each)
    const now = new Date().toISOString();

    // Upsert current
    const { error: upErr } = await supabase
      .from("team_wins")
      .upsert(rows.map(r => ({ ...r, updated_at: now })), { onConflict: "team_id" });
    if (upErr) throw upErr;

    // Append history (optional; bulk insert)
    await supabase.from("team_wins_history").insert(
      rows.map(r => ({ team_id: r.team_id, wins: r.wins, as_of: now }))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, updated: rows.length, at: now }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message }) };
  }
};
