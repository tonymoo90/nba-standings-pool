import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { ReactSortable } from "react-sortablejs";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Types ----------
type Team = { id: string; name: string };
type Conference = "east" | "west";
type Page = "picks" | "pool" | "how";

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

// ---------- Reusable row (with handle) ----------
function TeamRow({ t, index }: { t: Team; index: number }) {
  return (
    <div className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 select-none shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-white/60 w-5 text-right">{index + 1}</span>
        <img
          src={getLogo(t.id)}
          alt={t.name}
          className="w-5 h-5 object-contain rounded-full bg-white/10"
          draggable={false}
        />
        <span className="font-medium">{t.name}</span>
      </div>

      {/* Drag handle */}
      <div
        className="drag-handle ml-2 px-2 py-1 rounded-md text-white/60 hover:text-white cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </div>
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
          {isMobile ? "drag using ⋮⋮" : "drag to reorder"}
        </span>
      </div>

      <ReactSortable
        list={list}
        setList={setList}
        animation={200}
        className="flex flex-col gap-2"
        handle={isMobile ? ".drag-handle" : undefined}
        ghostClass="sortable-ghost"
        dragClass="sortable-drag"
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
              3. Highest total wins. Scoring:
            </h3>
          </div>
          <ul className="space-y-1 ml-3">
            <li>
              <span className="font-semibold text-white">Exact position</span> = +3 pts
            </li>
            <li>
              <span className="font-semibold text-white">Off by one</span> (±1 seed) = +2 pt
            </li>
            <li>
              <span className="font-semibold text-white">Off by two seeds</span> (±2 seed) = +1 pt
            </li>
            <li>
              <span className="font-semibold text-white">Bonus</span>: guess all Play-In teams = +3 pts
            </li>
          </ul>
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
                1. Rank Each Conference
              </h3>
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
    const entry = {
      id: String(Date.now()),
      name,
      east: [...east],
      west: [...west],
      submittedAt: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, entry]);
    alert(`Saved entry for ${name}!`);
  }

  return (
    <div className="min-h-[100vh] w-full bg-[#0b0f17] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8 text-left">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
              NBA Standings Predictions
            </h1>
            <p className="text-white/60 text-sm mb-4">
              Predict the final regular-season order for each conference.
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => setPage("picks")}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  page === "picks" ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                My Picks
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

          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
             {page === "picks" && (
            <>
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
              onClick={() => saveMyEntry("You")}
              className="rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
            >
              Save My Entry
            </button>
                </>
            )}
          </div>
        </div>

        {page === "picks" && (
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

        {page === "pool" && (
          <div className="rounded-2xl border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4"></h2>
            {entries.length === 0 ? (
              <p className="text-white/60">In-season pool rankings will be here.</p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{entry.name}</h3>
                      <span className="text-xs text-white/60">
                        {new Date(entry.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/60 mb-1">East Top 5:</p>
                        <ol className="text-white/80">
                          {entry.east.slice(0, 5).map((t: Team, i: number) => (
                            <li key={t.id}>{i + 1}. {t.name}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-white/60 mb-1">West Top 5:</p>
                        <ol className="text-white/80">
                          {entry.west.slice(0, 5).map((t: Team, i: number) => (
                            <li key={t.id}>{i + 1}. {t.name}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === "how" && <HowItWorks />}
      </div>
    </div>
  );
}
