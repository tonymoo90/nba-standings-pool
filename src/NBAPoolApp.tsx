import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ReactSortable } from "react-sortablejs";
import AuthBox from "./AuthBox";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import NameModal from "./NameModal";
import { createPortal } from "react-dom";
import { StandingsTable } from "./StandingsTable";
import { ArrowUpDown } from "lucide-react";

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

const VEGAS_EAST: Team[] = [
  { id: "CLE", name: "Cleveland Cavaliers" },
  { id: "NYK", name: "New York Knicks" },  
  { id: "ORL", name: "Orlando Magic" },
  { id: "PHI", name: "Philadelphia 76ers" },
  { id: "ATL", name: "Atlanta Hawks" },
  { id: "DET", name: "Detroit Pistons" },
  { id: "MIL", name: "Milwaukee Bucks" },
  { id: "BOS", name: "Boston Celtics" },
  { id: "IND", name: "Indiana Pacers" },
  { id: "MIA", name: "Miami Heat" },
  { id: "TOR", name: "Toronto Raptors" },
  { id: "CHI", name: "Chicago Bulls" },
  { id: "CHA", name: "Charlotte Hornets" },
  { id: "BKN", name: "Brooklyn Nets" },
  { id: "WAS", name: "Washington Wizards" },
];

const VEGAS_WEST: Team[] = [
  { id: "OKC", name: "Oklahoma City Thunder" },
  { id: "DEN", name: "Denver Nuggets" },
  { id: "HOU", name: "Houston Rockets" },  
  { id: "MIN", name: "Minnesota Timberwolves" },
  { id: "GSW", name: "Golden State Warriors" },
  { id: "LAL", name: "Los Angeles Lakers" },
  { id: "LAC", name: "Los Angeles Clippers" },
  { id: "DAL", name: "Dallas Mavericks" },  
  { id: "SAS", name: "San Antonio Spurs" },
  { id: "MEM", name: "Memphis Grizzlies" },
  { id: "NO", name: "New Orleans Pelicans" },
  { id: "PHX", name: "Phoenix Suns" },
  { id: "SAC", name: "Sacramento Kings" },
  { id: "POR", name: "Portland Trail Blazers" },
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
  const TOTAL_RANKS = 15; // real rules
  const weightForRank = (rank: number) => 16 - rank; // 1→15 … 15→1


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
            <h3 className="text-xl font-semibold tracking-wider text-white/70 uppercase mb-3">
              Rank all 15 teams in each conference.
            </h3>

            <p className="text-sm text-white/70 mb-3 text-base leading-relaxed">
              Scoring uses a <strong>15 → 1</strong> weight. Your <strong>#1 team gets 15×</strong> points per win, 
              <strong>#2 gets 14×</strong>, … <strong>#15 gets 1×</strong>.
            </p>

            <p className="text-sm text-white/70 mb-3 text-base leading-relaxed">
              Total points = <code className="opacity-80">Σ (team wins × weight)</code> across all teams in your entry.
              Weight = <code className="opacity-80">16 − rank</code>.
            </p>

            <p className="text-sm text-white/70 mb-6 text-base leading-relaxed">
              Drag the <span className="px-1 py-0.5 rounded bg-white/10">⋮⋮</span> handle to order teams for each conference, 
              then save before the season starts.
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

            <div className="rounded-2xl border-white/10 p-5 md:p-6 mb-3">
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
                        className="flex items-center bg-white/5 justify-between rounded-xl border border-white/10 bg-white/[0.08]
                                   px-5 py-4 md:px-6 md:py-5 mb-3 hover:bg-white/[0.12] transition-colors"
                      >
                        {/* LEFT: rank • weight • logo • name */}
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-xs font-semibold text-white/60 w-5 text-right px-4">              
                            ×{16 - (i + 1)}
                          </span>

                          {/* LOGO — hard-sized, cannot grow */}
                            <img
                              src={getLogo(t.id)}
                              alt={t.name}
                              className="w-full h-full object-contain"
                              style={{ width: "10%", height: "10%" }} // beats any global img rules
                            />
                

                          {/* TEAM NAME (single) */}
                          <span className="font-medium text-base truncate">{t.name}</span>
                        </div>

                        {/* RIGHT: drag handle */}
                        <span className="ml-2 text-white/60 text-lg leading-none">⋮⋮</span>
                      </motion.li>

                  ))}
                </AnimatePresence>
              </motion.ul>
            </div>
          </div>
        {/* --- Step 2: Save My Entry --- */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase mb-2">
            2. Submit Your Entry
          </h3>

          <div className="rounded-2xl border-white/10 p-6 md:p-8 text-center">
            <p className="text-white/70 text-sm mb-5">
              Once you’re happy with your picks, tap{" "}
              <span className="font-semibold text-white">Submit Entry</span> to lock them in.
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

function resetVegasOdds() {
  setEast([...VEGAS_EAST]);
  setWest([...VEGAS_WEST]);
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
          <div className="flex items-center justify-between mb-6">
            {/* LEFT: Logo + Title */}
            <div className="flex items-center gap-3">
              {/* Hard cap the logo size no matter what globals say */}
              <div
                className="shrink-0 overflow-hidden"
                style={{ width: 15, height: 25 }}          // <= tweak 40 → 48 if you want bigger
              >
                <img
                  src="/nbalogo.png"
                  alt="NBA Confidence Logo"
                  className="block w-full h-full object-contain"
                />
              </div>

              {/* Title with explicit colors (inline style beats inherited text color) */}
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                <span className="uppercase" style={{ color: "#17408B" }}>NBA</span>{" "}
                <span className="uppercase" style={{ color: "#D50032" }}>Confidence</span>
              </h1>
            </div>

            {/* RIGHT: Log Out */}
            {user || taggedEmail ? (
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setTaggedEmail(null);
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
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

    {!selectedEntry && (
      <>
      {/* Toolbar: 2024–25 Results / A–Z / Vegas Odds / Save My Entry */}
      <div className="flex flex-wrap gap-2 mt-2 mb-6">
        <button
          onClick={resetAlphabetical}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium flex items-center gap-2"
        >
          <ArrowUpDown size={12} />
          A-Z
        </button>

        <button
          onClick={resetVegasOdds}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium flex items-center gap-2"
        >
          <ArrowUpDown size={12} />
          2026 Odds
        </button>
        <button
          onClick={() => {
            if (isAuthRequired) { setShowAuth(true); return; }
            setShowNameModal(true);
          }}
          className="rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
        >
          Submit Entry
        </button>
      </div>
          
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

      {selectedEntry && (
        <SavedEntryView
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  )}



        {page === "pool" && (
          <div className="space-y-4">
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
        group relative block shrink-0
        rounded-2xl overflow-hidden
        border border-white/10
        bg-white/5 hover:border-white/20 hover:bg-white/[0.08]
        transition
        focus:outline-none focus:ring-2 focus:ring-indigo-500
      "
      style={{ 
        width: '180px', 
        minWidth: '180px', 
        height: '80px' 
      }}
    >
      <div className="px-4 py-3 h-full flex flex-col justify-between">
        {/* Top section: name and score */}
        <div className="flex items-center gap-2 min-w-0 w-full">
          <span 
            className="truncate font-semibold text-white/90 min-w-0 flex-1 block"
            style={{ fontSize: '13px', lineHeight: '1.2' }}
          >
            {entry.name}
          </span>
          <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
            0
          </span>
        </div>
        
        {/* Bottom section: Logo rows */}
        <div className="space-y-2">
          <LogoRow label="E" teams={entry.east} limit={8} size={22} overlap={9} />
          <LogoRow label="W" teams={entry.west} limit={8} size={22} overlap={9} />
        </div>
      </div>
    </button>
  );
}

function SavedEntriesRow({
  entries,
  onOpen,
}: {
  entries: Entry[];
  onOpen: (e: Entry) => void;
}) {
  if (!entries?.length) return null;

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold mb-3">Entries</h3>
      {/* Scrollable container with hidden scrollbar */}
      <div 
        className="overflow-x-scroll overflow-y-hidden no-scrollbar pb-2 -mx-6 px-6"
        style={{ overflowX: 'scroll' }}
      >
        {/* Flex container with gap */}
        <div className="flex gap-3">
          {entries.map((e) => (
            <SavedEntryTile key={e.id} entry={e} onClick={() => onOpen(e)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedEntryView({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  if (!entry) return null;
  
  const [viewConf, setViewConf] = React.useState<"east" | "west">("east");

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
      className="fixed inset-0 z-[2147483647] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-full max-w-5xl
             h-[90vh] sm:h-[85vh] min-h-0  
             rounded-2xl border border-white/10 bg-[#0b0f17] shadow-2xl
             flex flex-col"
      >
        {/* Header (fixed) */}
        <div className="flex-none sticky top-0 z-10 border-b border-white/10 bg-[#0b0f17]/95">
          <div className="flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold truncate">{entry.name}</h3>
              <span className="text-[10px] sm:text-xs text-white/60 hidden sm:inline">
                {new Date(entry.submittedAt).toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg
                         text-white/70 hover:text-white hover:bg-white/10
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sm:w-[18px] sm:h-[18px]">
                <path d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Mobile toggle - only visible on small screens */}
          <div className="flex sm:hidden items-center justify-center gap-2 px-3 pb-3">
            <span className="text-xs tracking-wider text-white/60 font-semibold uppercase">Conference</span>
            <div className="flex bg-white/10 rounded-full overflow-hidden p-[3px]">
              <button
                onClick={() => setViewConf("east")}
                className={`px-6 py-2 text-xs font-semibold rounded-full transition ${
                  viewConf === "east" ? "bg-indigo-600 text-white shadow-md" : "text-white/70"
                }`}
              >
                East
              </button>
              <button
                onClick={() => setViewConf("west")}
                className={`px-6 py-2 text-xs font-semibold rounded-full transition ${
                  viewConf === "west" ? "bg-indigo-600 text-white shadow-md" : "text-white/70"
                }`}
              >
                West
              </button>
            </div>
          </div>
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6">
          {/* Mobile: single column with toggle */}
          <div className="block sm:hidden">
            {viewConf === "east" ? (
              <div>
                <div className="text-[10px] tracking-wider text-white/60 uppercase mb-2">
                  Eastern Conference
                </div>
                <div className="flex flex-col gap-1.5">
                  {entry.east.map((t, i) => (
                    <TeamRowCompact key={t.id} t={t} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] tracking-wider text-white/60 uppercase mb-2">
                  Western Conference
                </div>
                <div className="flex flex-col gap-1.5">
                  {entry.west.map((t, i) => (
                    <TeamRowCompact key={t.id} t={t} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: 2 columns side by side */}
          <div className="hidden sm:grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs tracking-wider text-white/60 uppercase mb-3">
                Eastern Conference
              </div>
              <div className="flex flex-col gap-2">
                {entry.east.map((t, i) => (
                  <TeamRow key={t.id} t={t} index={i} locked />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-wider text-white/60 uppercase mb-3">
                Western Conference
              </div>
              <div className="flex flex-col gap-2">
                {entry.west.map((t, i) => (
                  <TeamRow key={t.id} t={t} index={i} locked />
                ))}
              </div>
            </div>
          </div>
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

// Compact version of TeamRow for mobile modal view
function TeamRowCompact({ t, index }: { t: Team; index: number }) {
  const weight = weightForIndex(index);
  return (
    <div className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 select-none">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-white/75 w-4 text-right tabular-nums shrink-0">
          {weight}
        </span>
        <img
          src={getLogo(t.id)}
          alt={t.name}
          className="w-1 h-1 object-contain rounded-full bg-white/10 shrink-0"
          style={{ width: "5%", height: "5%" }} // beats any global img rules
          draggable={false}
        />
        <span className="font-medium text-xs truncate">{t.name}</span>
        <span className="ml-1 text-[10px] text-white/50 shrink-0">×{weight}</span>
      </div>
    </div>
  );
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
  <div className="w-full">
    {/* Header section */}
    <div className="mx-auto max-w-5xl mb-3 flex items-center justify-between px-1">
      <h3 className="text-[20px] font-extrabold tracking-tight">CURRENT STANDINGS</h3>
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

    {/* Table container */}
    <div className="mx-auto max-w-5xl overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
      <div className="min-w-[680px]">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-2.5 text-[11px] uppercase tracking-wider text-white/60 bg-white/[0.06] sticky top-0 z-10 after:content-[''] after:block after:h-px after:bg-white/10 after:absolute after:inset-x-0 after:bottom-0 relative">
          <div className="w-[60px] shrink-0">Rank</div>
          <div className="flex-1">Player</div>
          <div className="w-[100px] shrink-0 text-right">Points</div>
        </div>

        {/* Table body */}
        <ul
          className="
            max-h-[520px] overflow-y-auto
            [&>li]:transition-colors
            [&>li+li]:border-t [&>li+li]:border-white/10
            [&>li:nth-child(odd)]:bg-white/5
            [&>li:nth-child(even)]:bg-white/10
            [&>li:hover]:bg-white/20
          "
        >
          {filtered.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-6 py-3">
              {/* Rank */}
              <div className="w-[60px] shrink-0 flex justify-start">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold
                    ${
                      e.rank === 1
                        ? "bg-yellow-500/20 text-yellow-300"
                        : e.rank === 2
                        ? "bg-slate-300/15 text-slate-200"
                        : e.rank === 3
                        ? "bg-amber-700/20 text-amber-300"
                        : "bg-white/10 text-white/80"
                    }`}
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