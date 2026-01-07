import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const handler: Handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("team_wins")
      .select("team_id,wins,updated_at");
    if (error) throw error;

    const wins: Record<string, number> = {};
    let last = "1970-01-01T00:00:00Z";
    for (const row of data || []) {
      wins[row.team_id] = row.wins;
      if (row.updated_at > last) last = row.updated_at;
    }

    return {
      statusCode: 200,
      headers: {
        "cache-control": "public, max-age=60",  // CDN cache 1 minute
      },
      body: JSON.stringify({ wins, updatedAt: last }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message }) };
  }
};
