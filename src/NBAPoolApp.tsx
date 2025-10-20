// NBAPoolApp.tsx
import * as React from "react";
import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---------- Types ----------
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

// ---------- Utils ----------
const getLogo = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/nba/500/${id.toLowerCase()}.png`;

// ------------- Demo data (make sure IDs match ESPN's slugs) -------------
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
  { id: "NOP", name: "New Orleans Pelicans" }, // NOP (not "NO")
  { id: "UTA", name: "Utah Jazz" },            // UTA (not "UTAH")
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
  { id: "NOP", name: "New Orleans Pelicans" }, // NOP
  { id: "OKC", name: "Oklahoma City Thunder" },
  { id: "PHX", name: "Phoenix Suns" },
  { id: "POR", name: "Portland Trail Blazers" },
  { id: "SAC", name: "Sacramento Kings" },
  { id: "SAS", name: "San Antonio Spurs" },
  { id: "UTA", name: "Utah Jazz" },            // UTA
];

// ---------- Pointer detection ----------
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

// ---------- Draggable row ----------
function SortableTeam({ id, index, name }: SortableTeamProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between w-full rounded-xl border border-white/10
                 bg-white/5 hover:bg-white/10 px-3 py-2 select-none cursor-grab active:cursor-grabbing
                 shadow-sm touch-none"
      {...attributes}
      {...listeners}
      aria-roledescription="sortable"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-white/60 w-5 text-right">{index + 1}</span>
        <img src={getLogo(id)} alt={name} className="w-5 h-5 object-contain rounded-full bg-white/10" />
        <span className="font-medium">{name}</span>
      </div>
      {/* visual grip only (no listeners needed) */}
      <span className="ml-2 p-2 rounded-md text-white/40">⋮⋮</span>
    </div>
  );
}

// ---------- Column with sensors ----------
function ListColumn({
  title,
  items,
  setItems,
  storageKey,
  activeTab,
  setActiveTab,
  showMobileToggle,
}: ListColumnProps) {
  const isCoarse = useCoarsePointer();

  // iOS Safari is fussy; having BOTH TouchSensor (with delay) and PointerSensor is the most reliable
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 240, tolerance: 8 }, // press & hold
    }),
    useSensor(
      PointerSensor,
      isCoarse
        ? { activationConstraint: { delay: 240, tolerance: 8 } } // phones/tablets
        : { activationConstraint: { distance: 4 } }              // desktop tiny move
    ),
    useSensor(KeyboardSensor)
  );

  const itemIds = useMemo(() => items.map((t) => t.id), [items]);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

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
            <h3 className="text-sm tracking-wider text-white/70 font-semibold uppercase">
              {title}
            </h3>
          )}
        </div>
        <span className="text-[10px] text-white/40">drag to reorder</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2 overscroll-contain touch-pan-y">
            {items.map((t, idx) => (
              <SortableTeam key={t.id} id={t.id} index={idx} name={t.name} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- (Optional) scoring helpers — comment out if Netlify enforces noUnusedLocals ----------
/*
function scoreConference(userList: Team[], actualList: Team[]) {
  const pickRank = new Map(userList.map((t, i) => [t.id, i + 1]));
  const actualRank = new Map(actualList.map((t, i) => [t.id, i + 1]));
  let points = 0;
  for (const t of actualList) {
    const pr = pickRank.get(t.id);
    const ar = actualRank.get(t.id);
    if (!pr || !ar) continue;
    const diff = Math.abs(pr - ar);
    if (diff === 0) points += 5;
    else if (diff === 1) points += 3;
    else if (diff === 2) points += 1;
  }
  return { points, max: 75 };
}
*/

// ---------- App ----------
export default function NBAPoolApp() {
  const [east, setEast] = useState<Team[]>(
    () => JSON.parse(localStorage.getItem("pool_east") || "null") || EAST_TEAMS
  );
  const [west, setWest] = useState<Team[]>(
    () => JSON.parse(localStorage.getItem("pool_west") || "null") || WEST_TEAMS
  );
  const [activeTab, setActiveTab] = useState<Conference>("east");
  const [page, setPage] = useState<"picks" | "pool">("picks");

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
  function saveMyEntry(name = "You") {
    const entry = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      name,
      east,
      west,
      submittedAt: new Date().toISOString(),
    };
    const next = JSON.parse(localStorage.getItem("pool_entries") || "[]");
    next.push(entry);
    localStorage.setItem("pool_entries", JSON.stringify(next));
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {/* Mobile (single column with toggle) */}
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
                showMobileToggle={true}
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
                showMobileToggle={true}
              />
            </div>
          )}
        </div>

        {/* Desktop (two columns, no toggle) */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <ListColumn
              title="Eastern Conference"
              items={east}
              setItems={setEast}
              storageKey="pool_east"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showMobileToggle={false}
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
              showMobileToggle={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
