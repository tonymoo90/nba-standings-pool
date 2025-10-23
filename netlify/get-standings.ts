import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { scoreAndSort } from "../../app/scoring";     // <- from earlier
import type { Entry, WinsTable } from "../../app/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const handler: Handler = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const [{ data: winsRows, error: wErr }, { data: entriesRows, error: eErr }] =
      await Promise.all([
        supabase.from("team_wins").select("team_id,wins,updated_at"),
        // replace with your actual entries table/query
        supabase.from("entries").select("*"),
      ]);

    if (wErr) throw wErr;
    if (eErr) throw eErr;

    const wins: WinsTable = Object.fromEntries(
      (winsRows || []).map(r => [r.team_id, r.wins])
    ) as WinsTable;

    const entries: Entry[] = (entriesRows || []) as any;
    const scored = scoreAndSort(entries, wins);

    const lastUpdated =
      (winsRows || []).reduce(
        (acc, r) => (r.updated_at > acc ? r.updated_at : acc),
        "1970-01-01T00:00:00Z"
      );

    return {
      statusCode: 200,
      headers: { "cache-control": "public, max-age=60" },
      body: JSON.stringify({ lastUpdated, standings: scored }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message }) };
  }
};
