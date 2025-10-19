import * as React from "react";
import { useState, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragEndEvent } from "@dnd-kit/core";


type Team = { id: string; name: string };
type Conference = "east" | "west";

type SetTeams = React.Dispatch<React.SetStateAction<Team[]>>;

interface ListColumnProps {
  title: string;
  items: Team[];
  setItems: SetTeams;
  storageKey: string;
  activeTab: Conference;
  setActiveTab: (tab: Conference) => void;
  showMobileToggle: boolean;
}

interface SortableTeamProps {
  id: string;
  index: number;
  name: string;
}
// Helper function to get logo URLs (for demo, using official CDN)
const getLogo = (id) => `https://a.espncdn.com/i/teamlogos/nba/500/${id.toLowerCase()}.png`;

const LAST_SEASON_EAST = [
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

const LAST_SEASON_WEST = [
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

const EAST_TEAMS = [
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

const WEST_TEAMS = [
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

function SortableTeam({ id, index, name }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const isCoarse = useCoarsePointer();
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between w-full rounded-xl border border-white/10
                 bg-white/5 hover:bg-white/10 px-3 py-2 select-none cursor-grab active:cursor-grabbing
                 shadow-sm touch-none"
      {...attributes}
      {...listeners}   // <-- row is draggable on BOTH desktop & mobile
    >
    <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-white/60 w-5 text-right">{index + 1}</span>
        <img src={getLogo(id)} alt={name} className="w-5 h-5 object-contain rounded-full bg-white/10" />
        <span className="font-medium">{name}</span>
      </div>



      {/* Handle — used on touch only */}
      <button
        type="button"
        aria-label="Drag to reorder"
        {...(isCoarse ? listeners : {})}  // Mobile: handle gets the listeners
        className="ml-2 p-2 rounded-md text-white/40 hover:text-white/70 hover:bg-white/10
                   cursor-grab active:cursor-grabbing touch-none"
      >
        ⋮⋮
      </button>
    </div>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setCoarse("matches" in e ? e.matches : (e as MediaQueryList).matches);
    setCoarse(mql.matches);
    mql.addEventListener?.("change", onChange as any);
    return () => mql.removeEventListener?.("change", onChange as any);
  }, []);
  return coarse;
}


function ListColumn({ title, items, setItems, storageKey, activeTab, setActiveTab, showMobileToggle,}) {
  // inside ListColumn
  const isCoarse = useCoarsePointer();

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      isCoarse
        ? { activationConstraint: { delay: 220, tolerance: 8 } }  // press & hold on mobile
        : { activationConstraint: { distance: 4 } }               // small move on desktop
    ),
    useSensor(KeyboardSensor)
  );

  const itemIds = useMemo(() => items.map((t) => t.id), [items]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }

  return (
    <div className="w-full">
     <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showMobileToggle ? (
            // MOBILE: Conference + pill
            <>
              <h3 className="text-sm tracking-wider text-white/70 font-semibold uppercase">
                Conference
              </h3>
             <div className="flex bg-white/10 rounded-full overflow-hidden p-[3px]">
              <button
                onClick={() => setActiveTab("east")}
                className={`px-6 py-3.5 text-sm font-semibold transition-all duration-200 rounded-full ${
                  activeTab === "east"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                East
              </button>
              <button
                onClick={() => setActiveTab("west")}
                className={`px-6 py-3.5 text-sm font-semibold transition-all duration-200 rounded-full ${
                  activeTab === "west"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                West
              </button>
            </div>

            </>
          ) : (
            // DESKTOP: just the title
            <h3 className="text-sm tracking-wider text-white/70 font-semibold uppercase">
              {title}
            </h3>
          )}
        </div>

        <span className="text-[10px] text-white/40">drag to reorder</span>
      </div>



      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}  modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2 overscroll-contain">
            {items.map((t, idx) => (
              <SortableTeam key={t.id} id={t.id} index={idx} name={t.name} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---- Scoring ----
// Per-team: exact=5, off-by-1=3, off-by-2=1, else=0. Max per conf = 75.
function scoreConference(
  userList: {id:string; name:string}[],
  actualList: {id:string; name:string}[]
) {
  const pickRank = new Map(userList.map((t, i) => [t.id, i + 1]));
  const actualRank = new Map(actualList.map((t, i) => [t.id, i + 1]));

  let points = 0;
  const breakdown: {
    id:string; name:string; pick:number; actual:number; diff:number; pts:number
  }[] = [];

  for (const t of actualList) {
    const pr = pickRank.get(t.id);
    const ar = actualRank.get(t.id);
    if (!pr || !ar) continue;
    const diff = Math.abs(pr - ar);
    let p = 0;
    if (diff === 0) p = 5;
    else if (diff === 1) p = 3;
    else if (diff === 2) p = 1;
    points += p;
    breakdown.push({ id: t.id, name: t.name, pick: pr, actual: ar, diff, pts: p });
  }
  return { points, max: 75, breakdown };
}

function scoreEntry(
  entry: { east:{id:string;name:string}[]; west:{id:string;name:string}[] },
  liveData: { east:{id:string;name:string}[]; west:{id:string;name:string}[] }
) {
  const eastScore = scoreConference(entry.east, liveData.east);
  const westScore = scoreConference(entry.west, liveData.west);
  const total = eastScore.points + westScore.points;
  const max = eastScore.max + westScore.max; // 150
  return { total, max, east: eastScore, west: westScore };
}


export default function NBAPoolApp() {
  const [east, setEast] = useState(() => JSON.parse(localStorage.getItem("pool_east")) || EAST_TEAMS);
  const [west, setWest] = useState(() => JSON.parse(localStorage.getItem("pool_west")) || WEST_TEAMS);
  const [activeTab, setActiveTab] = useState("east");
  const [page, setPage] = useState<"picks"|"pool">("picks");

  const [entries, setEntries] = useState(() =>
    JSON.parse(localStorage.getItem("pool_entries") || "[]")
  );

  // Live standings to score against (admin pastes these; persisted)
  const [live, setLive] = useState(() =>
    JSON.parse(localStorage.getItem("pool_live") || "null") || {
      east: LAST_SEASON_EAST,
      west: LAST_SEASON_WEST,
      updatedAt: new Date().toISOString(),
    }
  );

  // History of snapshots (each time live standings are updated)
  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem("pool_history") || "[]")
  );

  function saveEntries(next:any[]) {
    setEntries(next);
    localStorage.setItem("pool_entries", JSON.stringify(next));
  }
  function saveLive(next:{east:any[];west:any[]}) {
    const payload = { ...next, updatedAt: new Date().toISOString() };
    setLive(payload);
    localStorage.setItem("pool_live", JSON.stringify(payload));
    const snapshot = { ...payload, ts: Date.now() };
    const nextHist = [...history, snapshot];
    setHistory(nextHist);
    localStorage.setItem("pool_history", JSON.stringify(nextHist));
  }

  function autofillLastSeason() {
    setEast(LAST_SEASON_EAST);
    setWest(LAST_SEASON_WEST);
    localStorage.setItem("pool_east", JSON.stringify(LAST_SEASON_EAST));
    localStorage.setItem("pool_west", JSON.stringify(LAST_SEASON_WEST));
  }

  function resetAlphabetical() {
    setEast([...EAST_TEAMS]);
    setWest([...WEST_TEAMS]);
    localStorage.setItem("pool_east", JSON.stringify(EAST_TEAMS));
    localStorage.setItem("pool_west", JSON.stringify(WEST_TEAMS));
  }

  function clearAll() {
    setEast([]);
    setWest([]);
    localStorage.removeItem("pool_east");
    localStorage.removeItem("pool_west");
  }

  function handleSubmit() {
    const payload = {
      submittedAt: new Date().toISOString(),
      east: east.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name })),
      west: west.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name })),
    };
    console.log("Submitted Standings:", payload);
    alert("Standings submitted! Check the console for payload.");
  }

  function saveMyEntry(name = "You") {
  const entry = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    name,
    east,
    west,
    submittedAt: new Date().toISOString(),
  };
  const next = [...entries, entry];
  saveEntries(next);
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
                page === "picks"
                  ? "bg-white/20"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              My Picks
            </button>
            <button
              onClick={() => setPage("pool")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                page === "pool"
                  ? "bg-white/20"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              Standings
            </button>
          </div>
        </div>


          <div className="flex flex-wrap gap-2">
            <button onClick={autofillLastSeason} className="rounded-xl px-3 py-2  bg-white/10 hover:bg-white/20 text-sm font-medium">2024–25 Results</button>
            <button onClick={resetAlphabetical} className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium">A-Z</button>
            <button onClick={() => saveMyEntry("You")}
              className="rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold">
              Save My Entry
            </button>
          </div>
        </div>

        {/* Tabs for mobile view */}
        {/* Mobile only */}
        <div className="block md:hidden mb-6">
        {activeTab === "east" ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <ListColumn
              title="Eastern Conference"
              items={east}
              setItems={setEast}
              storageKey="pool_east"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showMobileToggle={true}     // <-- NEW
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <ListColumn
              title="Western Conference"
              items={west}
              setItems={setWest}
              storageKey="pool_west"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showMobileToggle={true}     // <-- NEW
            />
          </div>
        )}
      </div>



        {/* Columns for desktop */}
        {/* Desktop columns */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <ListColumn
              title="Eastern Conference"
              items={east}
              setItems={setEast}
              storageKey="pool_east"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showMobileToggle={false}    // <-- NEW
            />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <ListColumn
              title="Western Conference"
              items={west}
              setItems={setWest}
              storageKey="pool_west"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showMobileToggle={false}    // <-- NEW
            />
          </div>
        </div>


      </div>
    </div>
  );
}
