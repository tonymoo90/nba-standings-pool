import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

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
const ALL_TEAMS = Object.values(MAP);

type WinsRow = { team_id: string; wins: number };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ESPN_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

async function fetchWithRetry(url: string, tries = 3): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "nba-confidence/1.0" } });
      if (res.ok) return res.json();
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw lastErr;
}

function parseNumberLike(x: any): number {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const m = x.match(/^\s*(\d+)/);
    if (m) return Number(m[1]);
  }
  return 0;
}

// Find ALL entries anywhere in the JSON and extract wins from many possible fields
function extractWinsDeep(json: any): WinsRow[] {
  const rows: WinsRow[] = [];

  // ESPN sometimes wraps conferences under `children`
  const containers = Array.isArray(json.children) ? json.children : [json];

  for (const conf of containers) {
    const standings = conf?.standings ?? conf;
    const entries =
      standings?.entries ??
      standings?.children?.[0]?.standings?.entries ??
      [];

    for (const e of entries) {
      const abbr: string | undefined = e?.team?.abbreviation;
      if (!abbr) continue;
      const team_id = MAP[abbr];
      if (!team_id) continue;

      const winsStat = (e?.stats || []).find(
        (s: any) =>
          s?.name === "wins" ||
          s?.shortDisplayName === "W" ||
          s?.description === "Wins"
      );
      const wins = Number(winsStat?.value ?? winsStat?.displayValue ?? 0);
      rows.push({ team_id, wins: Number.isFinite(wins) ? wins : 0 });
    }
  }

  // Deduplicate (conference + league entries)
  const byTeam = new Map<string, number>();
  for (const r of rows) {
    byTeam.set(r.team_id, Math.max(r.wins, byTeam.get(r.team_id) ?? 0));
  }

  return Array.from(byTeam, ([team_id, wins]) => ({ team_id, wins }));
}
export const handler: Handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) Fetch and parse
    const data = await fetchWithRetry(ESPN_URL);
    let rows = extractWinsDeep(data);

    // Fallback attempts if coverage is low (merge best of multiple shapes)
    if (rows.length < 30) {
      try {
        const data2 = await fetchWithRetry(ESPN_URL + "?group=conference");
        const rows2 = extractWinsDeep(data2);
        const map = new Map(rows.map((r) => [r.team_id, r.wins]));
        for (const r of rows2) map.set(r.team_id, Math.max(map.get(r.team_id) ?? 0, r.wins));
        rows = Array.from(map, ([team_id, wins]) => ({ team_id, wins }));
      } catch {}
    }
    if (rows.length < 30) {
      try {
        const data3 = await fetchWithRetry(ESPN_URL + "?type=expanded");
        const rows3 = extractWinsDeep(data3);
        const map = new Map(rows.map((r) => [r.team_id, r.wins]));
        for (const r of rows3) map.set(r.team_id, Math.max(map.get(r.team_id) ?? 0, r.wins));
        rows = Array.from(map, ([team_id, wins]) => ({ team_id, wins }));
      } catch {}
    }

    const now = new Date().toISOString();

    // 2) Read current wins
    const { data: current, error: readErr } = await supabase
      .from("team_wins")
      .select("team_id,wins");
    if (readErr) throw readErr;

    const currentMap = new Map<string, number>((current ?? []).map((r: any) => [r.team_id, r.wins]));
    for (const r of rows) currentMap.set(r.team_id, r.wins);

    // First-run safeguard: ensure all 30 teams exist (seed missing as 0)
    for (const tid of ALL_TEAMS) {
      if (!currentMap.has(tid)) currentMap.set(tid, 0);
    }

    const mergedRows: WinsRow[] = Array.from(currentMap, ([team_id, wins]) => ({ team_id, wins }));
    const coverage = rows.length;

    // 3) Upsert latest snapshot
    const { error: upErr } = await supabase
      .from("team_wins")
      .upsert(mergedRows.map((r) => ({ ...r, updated_at: now })), { onConflict: "team_id" });
    if (upErr) throw upErr;

    // 4) Append history only if wins changed (compare to *prior* DB values)
    const historyRows = rows
      .filter((r) => (current ?? []).some((c: any) => c.team_id === r.team_id && c.wins !== r.wins))
      .map((r) => ({ team_id: r.team_id, wins: r.wins, as_of: now }));

    if (historyRows.length) {
      const { error: histErr } = await supabase.from("team_wins_history").insert(historyRows);
      if (histErr) throw histErr;
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        updated: mergedRows.length,  // should be 30 once seeded
        coverage,                    // how many we scraped this run
        history_appended: historyRows.length,
        at: now,
      }),
    };
  } catch (err: any) {
    console.error("[update-wins] error:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
    };
  }
};
