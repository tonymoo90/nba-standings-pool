import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ReactSortable } from "react-sortablejs";
import AuthBox from "./AuthBox";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import NameModal from "./NameModal";
import { createPortal } from "react-dom";

// ---------- Types ----------
type Team = { id: string; name: string };
type Conference = "east" | "west";
type Page = "picks" | "pool" | "how";
type Entry = {
  id: string;
  name: string;
  east: Team[];
  west: Team[];
  submittedAt: string;
};

// Map DB row (snake_case) -> UI Entry (camelCase)
type DbEntry = { id: string; name: string; east: Team[]; west: Team[]; submitted_at: string };
const toEntry = (db: DbEntry): Entry => ({
  id: db.id,
  name: db.name,
  east: db.east,
  west: db.west,
  submittedAt: db.submitted_at,
});

// state

// ---------- Utils ----------
const getLogo = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/nba/500/${id.toLowerCase()}.png`;

// ------------- Demo data (IDs match ESPN) -------------
const LAST_SEASON_EAST: Team[] = [
  { id: "CLE", name: "Cleveland Cavaliers" },
  { id: "BOS", name: "Boston Celtics" },
  { id: "NYK", name: "New York Knicks" },
  { id: "IND", name: "Indiana Pacers" },
  { id: "MIL", name: "Milwaukee Bucks" },
  { id: "DET", name: "Detroit Pistons" },
  { id: "ORL", name: "Orlando Magic" },
  { id: "ATL", name: "Atlanta Hawks" },
  { id: "CHI", name: "Chicago Bulls" },
  { id: "MIA", name: "Miami Heat" },
  { id: "TOR", name: "Toronto Raptors" },
  { id: "BKN", name: "Brooklyn Nets" },
  { id: "PHI", name: "Philadelphia 76ers" },
  { id: "CHA", name: "Charlotte Hornets" },
  { id: "WAS", name: "Washington Wizards" },
];

const LAST_SEASON_WEST: Team[] = [
  { id: "OKC", name: "Oklahoma City Thunder" },
  { id: "HOU", name: "Houston Rockets" },
  { id: "LAL", name: "Los Angeles Lakers" },
  { id: "DEN", name: "Denver Nuggets" },
  { id: "LAC", name: "Los Angeles Clippers" },
  { id: "MIN", name: "Minnesota Timberwolves" },
  { id: "GSW", name: "Golden State Warriors" },
  { id: "MEM", name: "Memphis Grizzlies" },
  { id: "SAC", name: "Sacramento Kings" },
  { id: "DAL", name: "Dallas Mavericks" },
  { id: "PHX", name: "Phoenix Suns" },
  { id: "POR", name: "Portland Trail Blazers" },
  { id: "SAS", name: "San Antonio Spurs" },
  { id: "NO", name: "New Orleans Pelicans" },
  { id: "UTAH", name: "Utah Jazz" },
];

const EAST_TEAMS: Team[] = [
  { id: "ATL", name: "Atlanta Hawks" },
  { id: "BOS", name: "Boston Celtics" },
  { id: "BKN", name: "Brooklyn Nets" },
  { id: "CHA", name: "Charlotte Hornets" },
  { id: "CHI", name: "Chicago Bulls" },
  { id: "CLE", name: "Cleveland Cavaliers" },
  { id: "DET", name: "Detroit Pistons" },
  { id: "IND", name: "Indiana Pacers" },
  { id: "MIA", name: "Miami Heat" },
  { id: "MIL", name: "Milwaukee Bucks" },
  { id: "NYK", name: "New York Knicks" },
  { id: "ORL", name: "Orlando Magic" },
  { id: "PHI", name: "Philadelphia 76ers" },
  { id: "TOR", name: "Toronto Raptors" },
  { id: "WAS", name: "Washington Wizards" },
];

const WEST_TEAMS: Team[] = [
  { id: "DAL", name: "Dallas Mavericks" },
  { id: "DEN", name: "Denver Nuggets" },
  { id: "GSW", name: "Golden State Warriors" },
  { id: "HOU", name: "Houston Rockets" },
  { id: "LAC", name: "Los Angeles Clippers" },
  { id: "LAL", name: "Los Angeles Lakers" },
  { id: "MEM", name: "Memphis Grizzlies" },
  { id: "MIN", name: "Minnesota Timberwolves" },
  { id: "NO", name: "New Orleans Pelicans" },
  { id: "OKC", name: "Oklahoma City Thunder" },
  { id: "PHX", name: "Phoenix Suns" },
  { id: "POR", name: "Portland Trail Blazers" },
  { id: "SAC", name: "Sacramento Kings" },
  { id: "SAS", name: "San Antonio Spurs" },
  { id: "UTAH", name: "Utah Jazz" },
];

// --- Ranking helpers (15 is max weight for the #1 team) ---
const RANK_MAX = 15;                      // list length
const weightForIndex = (i: number) => RANK_MAX - i; // 0→15, 14→1

// Convert a list order to a weight map: { ATL: 15, BOS: 14, ... }
type WeightMap = Record<string, number>;
const listToWeights = (list: Team[]): WeightMap =>
  Object.fromEntries(list.map((t, i) => [t.id, weightForIndex(i)]));

// Team wins lookup you'll get from an API/db later
type TeamWins = Record<string, number>;   // e.g. { BOS: 64, ATL: 41, ... }

// Compute a user's score (east + west) using wins × rank-weight
const scoreEntry = (east: Team[], west: Team[], wins: TeamWins) => {
  const wEast = listToWeights(east);
  const wWest = listToWeights(west);
  let total = 0;
  for (const [id, wt] of Object.entries({ ...wEast, ...wWest })) {
    total += (wins[id] ?? 0) * wt;
  }
  return total;
};


function useAuth() {
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };
    init();
    const sub = supabase.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  return user;
}


// ---------- Reusable row (with handle) ----------
function TeamRow({
  t,
  index,
  locked = false,               // <-- default false
}: {
  t: Team;
  index: number;
  locked?: boolean;             // <-- optional
}) {
  const weight = weightForIndex(index); // 15..1
  return (
    <div className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 select-none shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-white/75 w-6 text-right tabular-nums">
          {weight}
        </span>
        <img
          src={getLogo(t.id)}
          alt={t.name}
          className="w-5 h-5 object-contain rounded-full bg-white/10"
          draggable={false}
        />
        <span className="font-medium">{t.name}</span>
        <span className="ml-2 text-xs text-white/50">×{weight}</span>
      </div>

      {!locked && (
        <div
          className="drag-handle ml-2 px-2 py-1 rounded-md text-white/60 hover:text-white cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </div>
      )}
    </div>
  );
}



// ---------- Column (SortableJS) ----------
function ListColumn({
  title,
  list,
  setList,
  activeTab,
  setActiveTab,
  showMobileToggle,
  isMobile = false,
  locked,                  // <-- NEW
}: {
  title: string;
  list: Team[];
  setList: (next: Team[]) => void;
  activeTab: Conference;
  setActiveTab: (tab: Conference) => void;
  showMobileToggle: boolean;
  isMobile?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showMobileToggle ? (
            <>
              <h3 className="text-sm tracking-wider text-white/70 font-semibold uppercase">
                Conference
              </h3>
              <div className="flex bg-white/10 rounded-full overflow-hidden p-[3px]">
                <button
                  onClick={() => setActiveTab("east")}
                  className={`px-6 py-3.5 text-sm font-semibold rounded-full transition ${
                    activeTab === "east" ? "bg-indigo-600 text-white shadow-md" : "text-white/70"
                  }`}
                >
                  East
                </button>
                <button
                  onClick={() => setActiveTab("west")}
                  className={`px-6 py-3.5 text-sm font-semibold rounded-full transition ${
                    activeTab === "west" ? "bg-indigo-600 text-white shadow-md" : "text-white/70"
                  }`}
                >
                  West
                </button>
              </div>
            </>
          ) : (
            <h3 className="text-sm tracking-wider text-white/70 font-semibold uppercase">
              {title}
            </h3>
          )}
        </div>
        <span className="text-[10px] text-white/40">
          {isMobile ? "" : "drag to reorder"}
        </span>
      </div>

      <ReactSortable
        list={list}
        setList={setList}
        animation={200}
        className="flex flex-col gap-2"
        handle={isMobile ? ".drag-handle" : undefined}
        ghostClass="sortable-ghost"
        dragClass="sortable-drag"            // <-- add this
      >
        {list.map((t, i) => (
          <TeamRow key={t.id} t={t} index={i} />
        ))}
      </ReactSortable>
    </div>
  );
}

function SaveEntryDemo() {
  type Phase = "idle" | "press" | "saving" | "success";
  const [phase, setPhase] = React.useState<Phase>("idle");

  React.useEffect(() => {
    let t1: any, t2: any, t3: any;
    const run = () => {
      setPhase("press");
      t1 = setTimeout(() => setPhase("saving"), 250);
      t2 = setTimeout(() => setPhase("success"), 1350);
      t3 = setTimeout(() => setPhase("idle"), 2500);
    };
    run();
    const loop = setInterval(run, 4000);
    return () => {
      clearInterval(loop);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <motion.button
      type="button"
      className="relative inline-flex items-center mb-6 justify-center gap-2 rounded-xl px-4 py-2.5 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-500 transition"
      animate={phase === "press" ? { scale: 0.96 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === "saving" ? (
          <motion.span
            key="saving"
            className="inline-flex items-center gap-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <Spinner />
            Saving…
          </motion.span>
        ) : phase === "success" ? (
          <motion.span
            key="success"
            className="inline-flex items-center gap-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Saved!
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Save My Entry
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ----------------- Small helper icons ----------------- */

function Spinner() {
  return (
    <motion.span
      className="inline-block w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  );
}

function Check() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- Rules & Scoring (text-only padding) ----------
function RulesCard() {
  return (
    <div className="rounded-2xl p-6 ">
      {/* Padding applies only to the text/content, not the outer container */}
      <div className="p-6 md:p-8 text-[15px] leading-6 text-white/90 space-y-5">
        {/* Basic rules */}

        {/* Divider */}
       

        {/* Scoring example */}
        <div>
          <div className="text-xs text-white/60 uppercase tracking-wide mb-2"><h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase mt-3 mb-3">
              3. Highest total wins.
            </h3>
          </div>
        </div>


            </div>
    </div>
  );
}

/* =========================
   How It Works (animated)
   ========================= */
function HowItWorks() {
  const eastList = React.useMemo(
    () => [
      { id: "BOS", name: "Boston" },
      { id: "NYK", name: "New York" },
      { id: "MIA", name: "Miami" },
      { id: "PHI", name: "Philadelphia" },
      { id: "ATL", name: "Atlanta" },
    ],
    []
  );

  const westList = React.useMemo(
    () => [
      { id: "DAL", name: "Dallas" },
      { id: "DEN", name: "Denver" },
      { id: "GSW", name: "Golden State" },
      { id: "LAL", name: "LA Lakers" },
      { id: "PHX", name: "Phoenix" },
    ],
    []
  );

  const [demoConf, setDemoConf] = React.useState<"east" | "west">("east");
  const [demo, setDemo] = React.useState(eastList);

  React.useEffect(() => {
    setDemo(demoConf === "east" ? eastList : westList);
  }, [demoConf, eastList, westList]);

  // Auto reorder and toggle every few cycles
  React.useEffect(() => {
    let cycle = 0;
    const timer = setInterval(() => {
      setDemo((prev) => {
        const next = [...prev];
        if (next.length > 2) {
          const [moved] = next.splice(2, 1);
          next.splice(0, 0, moved);
        }
        return next;
      });
      cycle++;
      if (cycle >= 3) {
        setDemoConf((prev) => (prev === "east" ? "west" : "east"));
        cycle = 0;
      }
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="rounded-2xl border-white/10 p-6 md:p-8 shadow-inner">
      
        <div className="grid md:grid-cols-2 gap-10">
          {/* DEMO */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase mb-3">
                1. Rank all 15 teams in each conference. 
              </h3>
            <p className="text-white/70 mb-6 text-base leading-relaxed p-6">
                Your #1 team gets 15× points per win, #2 gets 14×, … #15 gets 1×.
            </p>
            <p className="text-white/70 mb-6 text-base leading-relaxed p-6">
              Total points = sum of (wins × your rank weight) across all teams.
            </p>
            <p className="text-white/70 mb-6 text-base leading-relaxed p-6">
                Order teams using the{" "}
              <span className="px-1 py-0.5 rounded ">⋮⋮</span>{" "}
              handle to set the order for each conference. Save your entry before the season starts.
            </p>

            <div className="flex items-center justify-between mb-3 ">

              {/* Always visible toggle */}
              <div className="flex bg-white/10 rounded-full overflow-hidden p-[3px]">
                <button
                  onClick={() => setDemoConf("east")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    demoConf === "east"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  East
                </button>
                <button
                  onClick={() => setDemoConf("west")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    demoConf === "west"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  West
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5  border-white/10 p-5 md:p-6 mb-3">
              <motion.ul
                key={demoConf}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <AnimatePresence initial={false}>
                  {demo.map((t, i) => (
                    <motion.li
                      key={`${demoConf}-${t.id}`}
                      layout
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-white/60 w-5 text-right">
                          {i + 1}
                        </span>
                        <img
                          src={getLogo(t.id)}
                          alt={t.name}
                          className="w-5 h-5 object-contain rounded-full bg-white/20"
                        />
                        <span className="font-medium">{t.name}</span>
                      </div>
                      <span className="ml-2 text-white/60">⋮⋮</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </div>
          </div>
        {/* --- Step 2: Save My Entry --- */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase mb-2">
            2. Save Your Entry
          </h3>

          <div className="rounded-2xl border-white/10 p-6 md:p-8 text-center">
            <p className="text-white/70 text-sm mb-5">
              Once you’re happy with your picks, tap{" "}
              <span className="font-semibold text-white">Save My Entry</span> to lock them in.
            </p>

            <SaveEntryDemo />
          </div>
        </div>

          {/* RULES */}
          <div>
          <RulesCard />
          </div>
        </div>
      </div>
    </div>
  );
}
// ---------- App ----------
export default function NBAPoolApp() {
  const [east, setEast] = useState<Team[]>(EAST_TEAMS);
  const [west, setWest] = useState<Team[]>(WEST_TEAMS);
  const [activeTab, setActiveTab] = useState<Conference>("east");
  const [page, setPage] = useState<Page>("picks");
  const [entries, setEntries] = useState<any[]>([]);
  const user = useAuth();
  const [taggedEmail, setTaggedEmail] = useState<string | null>(null);
  // top of file (near other state)
  const SEASON = "2025-26";
  const [showAuth, setShowAuth] = React.useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lastSaved, setLastSaved] = useState<any | null>(null);

  // TODO: Replace with real wins per team (e.g., from your standings API)
  const wins: TeamWins = {}; // e.g. { BOS: 64, ATL: 41, ... }

  // Points calculator
  const pointsFor = (e: Entry) => scoreEntry(e.east, e.west, wins);


  const [myEntryId, setMyEntryId] = useState<string | null>(null);

  // standings
  const [standingsCount, setStandingsCount] = useState<number>(0);
  const [publicEntries, setPublicEntries] = useState<any[]>([]);

  const isAuthRequired = page === "picks" && !user && !taggedEmail;

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const formatCount = (n: number) => (n > 99 ? "99+" : String(n));

  // Load *all* public entries for the season (for Standings)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("id,name,east,west,submitted_at")
        .eq("season", SEASON)
        .eq("is_public", true)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("[standings] load error", error);
        return;
      }
      if (!cancelled) {
        setPublicEntries((data ?? []).map(toEntry));
      }
    })();
    return () => { cancelled = true; };
  }, [SEASON]);
 
  // Load the user's saved entries on sign-in / refresh
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("id,name,east,west,submitted_at")
        .eq("user_id", user.id)
        .eq("season", SEASON)            // keep per-season, or remove this line for all seasons
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      if (!cancelled) {
        setEntries((data ?? []).map(toEntry));
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("entries-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entries",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const e = toEntry(payload.new as DbEntry);
          setEntries((prev) => [e, ...prev]); // newest first
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


    // OPEN the modal whenever auth is required
  React.useEffect(() => {
    if (isAuthRequired) {
      console.log("[Auth] Opening modal (auth required)");
      setShowAuth(true);
    }
  }, [isAuthRequired]);

  // CLOSE the modal as soon as auth is satisfied
  React.useEffect(() => {
    if (user || taggedEmail) {
      if (showAuth) console.log("[Auth] Closing modal (auth satisfied)");
      setShowAuth(false);
    }
  }, [user, taggedEmail]); // eslint-disable-line



  async function handleLogout() {
    await supabase.auth.signOut();
    setTaggedEmail(null);
    alert("You’ve been logged out.");
  }

  function autofillLastSeason() {
    // Use your last-season helpers if you want; keeping demo simple
    // setEast(LAST_SEASON_EAST); setWest(LAST_SEASON_WEST);
    setEast(LAST_SEASON_EAST);
    setWest(LAST_SEASON_WEST);
  }

  function resetAlphabetical() {
    setEast([...EAST_TEAMS]);
    setWest([...WEST_TEAMS]);
  }

  function saveMyEntry(name = "You") {
  const entry: Entry = {
    id: String(Date.now()),
    name,
    east: [...east],
    west: [...west],
    submittedAt: new Date().toISOString(),
  };
  setEntries((prev) => [entry, ...prev]);   // ✅ use `entry`
  alert(`Saved entry for ${name}!`);
}

  async function saveMyEntryToDB(name: string) {
    try {
      setSaving(true);

      const payload = {
        user_id: user.id,
        email: user.email,
        name,
        east,
        west,
        season: SEASON,
        is_public: true,
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("entries")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        // unique-name collision, etc.
        if ((error as any).code === "23505") {
          alert("That name is already in use for this season. Please choose another.");
          return;                    // ← do NOT close
        }
        throw error;
      }

      // success ➜ close the modal
      setShowNameModal(false);

      // update UI
      setEntries((prev) => [toEntry(data as DbEntry), ...prev]);
      setLastSaved(data);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const myCount = entries?.length ?? 0; // assuming entries = current user’s entries

  return (
    <div className="min-h-[100vh] w-full bg-[#0b0f17] text-white">
     {/* Mount the modal once, control with showAuth */}
      <AuthModal
        open={showAuth}
        onClose={() => {
          // Don’t close if auth is still required
          if (!isAuthRequired) setShowAuth(false);
        }}
      />


      <div className="mx-auto max-w-6xl px-6 py-8 text-left">
  {/* Top bar: title left, logout right */}
  <div className="mb-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl sm:text-3xl mb-4 font-semibold tracking-tight uppercase">
        NBA Confidence
      </h1>

     
      {/* Move Log Out button here so it's aligned */}
      {user || taggedEmail ? (
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            setTaggedEmail(null);
          }}
          className="rounded-xl mb-4 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
        >
          Log Out
        </button>
      ) : null}
    </div>

    {/* Page tabs under the title (left) */}
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={() => setPage("picks")}
        className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition
          ${page === "picks"
            ? "bg-white/20 text-white"
            : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"}`}
      >
        My Picks
        {entries.length > 0 && (
          <span className="ml-1 inline-flex h-5 items-center justify-center rounded-full text-[12px] font-semibold text-white/80 leading-none">
            ({entries.length})
          </span>
        )}
      </button>

      <button
        onClick={() => setPage("pool")}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${
          page === "pool" ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        Standings
      </button>

      <button
        onClick={() => setPage("how")}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${
          page === "how" ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        How it works
      </button>
    </div>
  </div>

  {/* ----- Saved entries goes here (ABOVE the toolbar) ----- */}
  {page === "picks" && (
    <>
      <SavedEntriesRow
        entries={entries}
        onOpen={(e) => setSelectedEntry(e)}
      />

      {/* Toolbar: 2024–25 Results / A–Z / Save My Entry */}
      <div className="flex flex-wrap gap-2 mt-2 mb-6">
        <button
          onClick={autofillLastSeason}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium"
        >
          2024–25 Results
        </button>
        <button
          onClick={resetAlphabetical}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium"
        >
          A–Z
        </button>
        <button
          onClick={() => {
            if (isAuthRequired) { setShowAuth(true); return; }
            setShowNameModal(true);
          }}
          className="rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          Save My Entry
        </button>
      </div>

      {selectedEntry && (
        <SavedEntryView
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  )}




        {page === "picks" && (
        <>
          
          {/* Only show picks interface if authenticated */}
          {!isAuthRequired && (
            <>
              {/* Mobile: single column with toggle */}
              <div className="block md:hidden mb-6">
                {activeTab === "east" ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <ListColumn
                      title="Eastern Conference"
                      list={east}
                      setList={setEast}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      showMobileToggle={true}
                      isMobile={true}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <ListColumn
                      title="Western Conference"
                      list={west}
                      setList={setWest}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      showMobileToggle={true}
                      isMobile={true}
                    />
                  </div>
                )}
              </div>

              {/* Desktop: two columns, no toggle */}
              <div className="hidden md:grid grid-cols-2 gap-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <ListColumn
                    title="Eastern Conference"
                    list={east}
                    setList={setEast}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    showMobileToggle={false}
                    isMobile={false}
                  />
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <ListColumn
                    title="Western Conference"
                    list={west}
                    setList={setWest}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    showMobileToggle={false}
                    isMobile={false}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}



        {page === "pool" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Standings</h2>

            {/* If you later have wins, pass them in as the second prop */}
            <StandingsTable entries={entries} />
          </div>
        )}


        {page === "how" && <HowItWorks />}
      
        <NameModal
          open={showNameModal}
          saving={saving}
          userId={user?.id}
          season={SEASON}
          onCancel={() => setShowNameModal(false)}   // ← this must exist
          onSave={(name) => saveMyEntryToDB(name)}
        />

      </div>
    </div>


  );
}
 
    // Mini list (top-2) used inside tiles
    // Tiny logo row: exactly one horizontal line (no wrap)
  // Compact overlapping logo row with label prefix (E: / W:)
  function LogoRow({
  label,
  teams,
  limit = 8,
  size = 22,
  overlap = 9,
}: {
  label: string;
  teams: Team[];
  limit?: number;
  size?: number;
  overlap?: number;
}) {
  return (
    // row padding keeps content off the card edges
    <div className="flex items-center px-2">
      <span className="mr-3 w-5 text-center font-semibold uppercase text-white/60">{label}</span>
      <div className="flex items-center">
        {teams.slice(0, limit).map((t, i) => (
          <div
            key={t.id}
            className="relative"
            style={{ marginLeft: i === 0 ? 0 : `-${overlap}px`, zIndex: teams.length - i }}
          >
            <img
              src={getLogo(t.id)}
              alt={t.name}
              title={t.name}
              width={size}
              height={size}
              className="rounded-full object-contain"
              style={{
                width: size,
                height: size,
                border: "1px solid rgba(255,255,255,0.28)", // subtle stroke
                background: "rgba(255,255,255,0.08)",
                boxShadow: "0 0 3px rgba(0,0,0,0.5)",
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


  function SavedEntryTile({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        group relative shrink-0
        w-[240px] sm:w-[260px] md:w-[300px]
        snap-start
        overflow-hidden rounded-2xl
        border border-white/10 bg-white/5
        hover:border-white/20 hover:bg-white/[0.08]
        transition focus:outline-none focus:ring-2 focus:ring-indigo-500
      "
    >
      <div className="px-5 py-4 md:px-6 md:py-5 space-y-3 text-left">
        {/* top row */}
        <div className="flex items-center justify-between">
          <div className="truncate text-[15px] md:text-base font-semibold text-white/90">
            {entry.name}
          </div>
          <div className="ml-3 shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
            0
          </div>
        </div>

        {/* ✅ Show logos everywhere > 640px; hide only on phones */}
        <div className="space-y-3 max-sm:hidden">
          <LogoRow label="E" teams={entry.east} limit={8} size={22} overlap={9} />
          <LogoRow label="W" teams={entry.west} limit={8} size={22} overlap={9} />
        </div>

        {/* Optional ultra-compact line for phones */}
      </div>
    </button>
  );
}

  // The horizontal “Saved entries” row
  function SavedEntriesRow({ entries, onOpen }: { entries: Entry[]; onOpen: (e: Entry) => void }) {
  if (!entries?.length) return null;
  return (
    <div className="mt-6 mb-6">
      <h3 className="text-base font-semibold mb-3">Saved entries</h3>

      <div
        className="
          -mx-6 px-6    /* edge-to-edge swipe on mobile */
          flex gap-3 overflow-x-auto pb-2
          snap-x snap-mandatory
          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
      >
        {entries.map(e => (
          <SavedEntryTile key={e.id} entry={e} onClick={() => onOpen(e)} />
        ))}
      </div>
    </div>
  );
}


function SavedEntryView({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  if (!entry) return null;

  // Close on ESC
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const overlay = (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-[min(96vw,1000px)]
             h-[85vh] min-h-0  
             rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl
             flex flex-col"
      >
        {/* Header (fixed) */}
        <div className="flex-none sticky top-0 z-10 flex items-center justify-between px-5 py-4
                        border-b border-white/10 bg-[#0b0f17]/95">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{entry.name}</h3>
            <span className="text-xs text-white/60">
              {new Date(entry.submittedAt).toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg
                       text-white/70 hover:text-white hover:bg-white/10
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs tracking-wider text-white/60 uppercase mb-2">Eastern Conference</div>
              <div className="flex flex-col gap-2">
                {entry.east.map((t, i) => (
                  <TeamRow key={t.id} t={t} index={i} locked />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-wider text-white/60 uppercase mb-2">Western Conference</div>
              <div className="flex flex-col gap-2">
                {entry.west.map((t, i) => (
                  <TeamRow key={t.id} t={t} index={i} locked />
                ))}
              </div>
            </div>
          </div>
          <div className="h-2" />
        </div>
      </div>

    </div>
  );

  // Prefer the portal, but gracefully fall back to inline render
  if (typeof document !== "undefined") {
    const container = document.getElementById("portal-root");
    if (container) return createPortal(overlay, container);
  }
  return overlay;
}

function EntryAvatar({ entry }: { entry: Entry }) {
  const eastTop = entry.east?.[0];
  const westTop = entry.west?.[0];
  return (
    <div className="relative h-6 w-10">
      {westTop && (
        <img
          src={getLogo(westTop.id)}
          alt={westTop.name}
          className="absolute right-0 top-0 h-5 w-5 rounded-full border border-white/20 bg-white/10 object-contain"
          draggable={false}
        />
      )}
      {eastTop && (
        <img
          src={getLogo(eastTop.id)}
          alt={eastTop.name}
          className="absolute left-0 bottom-0 h-5 w-5 rounded-full border border-white/20 bg-white/10 object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}




function StandingsList({
  rows,
  title = "Standings",
}: {
  rows: Array<{ id: string; name: string; points: number }>;
  title?: string;
}) {
  // sort by points desc, then name asc
  const sorted = [...rows].sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));

  const rankBadge = (rank: number) => {
    // subtle medal tones for 1/2/3, otherwise neutral
    const styles =
      rank === 1
        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
        : rank === 2
        ? "bg-slate-400/20 text-slate-200 ring-1 ring-slate-300/30"
        : rank === 3
        ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/30"
        : "bg-white/10 text-white/80 ring-1 ring-white/10";

    return (
      <div
        className={`mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full
                    text-[13px] font-bold tabular-nums ${styles}`}
      >
        {rank}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase">{title}</h3>
        {/* mini legend if you want it later */}
      </div>

      <ul className="space-y-2">
        {sorted.length === 0 && (
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white/60">
            No public entries yet.
          </li>
        )}

        {sorted.map((r, i) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-xl
                       border border-white/10 bg-[#0f1521]/70 px-4 py-3
                       shadow-sm hover:bg-white/[0.06] transition"
          >
            {/* Left: rank badge + name */}
            <div className="flex min-w-0 items-center">
              {rankBadge(i + 1)}
              <div className="min-w-0">
                <div className="truncate text-base font-medium">{r.name}</div>
              </div>
            </div>

            {/* Right: points pill */}
            <div className="ml-4 shrink-0">
              <span
                className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1
                           text-sm font-semibold tabular-nums"
                title={`${r.points} pts`}
              >
                {r.points}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- tiny overlapped logos (E & W top picks) ---------- */
function EntryMiniLogos({ east, west }: { east?: Team; west?: Team }) {
  return (
    <div className="relative h-6 w-9">
      {east && (
        <img
          src={getLogo(east.id)}
          alt={east.name}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full object-contain ring-1 ring-white/20 bg-white/10"
          draggable={false}
        />
      )}
      {west && (
        <img
          src={getLogo(west.id)}
          alt={west.name}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full object-contain ring-1 ring-white/20 bg-white/10"
          draggable={false}
          style={{ marginLeft: '-8px' }}
        />
      )}
    </div>
  );
}

/* ---------- one row ---------- */
function StandingsRow({
  rank,
  entry,
  points = 0,
  onClick,
}: {
  rank: number;
  entry: Entry;
  points?: number;
  onClick?: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className="grid grid-cols-[64px_1fr_96px] items-center px-5 py-3 md:py-3.5
                 hover:bg-white/[0.05] transition border-t border-white/8 first:border-t-0"
      role={onClick ? 'button' : undefined}
    >
      {/* rank chip */}
      <div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10
                         text-[13px] font-semibold text-white/85">{rank}</span>
      </div>

      {/* entry */}
      <div className="flex items-center gap-3 min-w-0">
        <EntryMiniLogos east={entry.east?.[0]} west={entry.west?.[0]} />
        <div className="min-w-0">
          <div className="truncate font-medium text-white/90">{entry.name}</div>
          <div className="mt-0.5 text-[12px] text-white/55 truncate">
            E: {entry.east?.[0]?.name ?? '—'} • W: {entry.west?.[0]?.name ?? '—'}
          </div>
        </div>
      </div>

      {/* points pill */}
      <div className="text-right">
        <span className="inline-flex items-center justify-end rounded-md bg-white/10
                         px-2.5 py-1 text-sm font-semibold text-white/90">{points}</span>
      </div>
    </li>
  );
}

/* ---------- table wrapper ---------- */
function StandingsTable({ entries }: { entries: Entry[] }) {
  const ranked = [...entries]
    .map((e, i) => ({ ...e, rank: i + 1, points: 0 })) // placeholder for now
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="grid grid-cols-[80px_1fr_100px] items-center px-5 py-3 
                      text-xs uppercase tracking-wider text-white/60 bg-white/[0.05]">
        <span>Rank</span>
        <span>Entry</span>
        <span className="text-right">Points</span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-white/10">
        {ranked.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[80px_1fr_100px] items-center px-5 py-3.5 
                       hover:bg-white/[0.06] transition text-white/90"
          >
            <span className="font-semibold text-sm text-white/80">{e.rank}</span>
            <span className="truncate text-[15px] font-medium">{e.name}</span>
            <span className="text-right font-semibold text-white/90">{e.points}</span>
          </li>
        ))}

        {!ranked.length && (
          <li className="px-5 py-10 text-center text-white/60">No entries yet.</li>
        )}
      </ul>
    </div>
  );
}

