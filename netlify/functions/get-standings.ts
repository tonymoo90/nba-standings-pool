import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const handler: Handler = async () => {
  try {
    console.log("ENV CHECK:", {
      url: process.env.SUPABASE_URL,
      key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // pull the computed leaderboard (points already calculated in SQL)
    const { data, error } = await supabase
      .from("leaderboard_weighted")
      .select("*");

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, rows: data }),
      headers: { "content-type": "application/json" },
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message || String(e) }),
      headers: { "content-type": "application/json" },
    };
  }
};
