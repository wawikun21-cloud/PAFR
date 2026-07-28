import { cn } from "@/lib/utils";
import { HierarchyProvider, useHierarchy } from "@/components/hierarchy/HierarchyContext";
import AreaAccordion from "@/components/hierarchy/AreaAccordion";
import SelectedSquadronPanel from "@/components/hierarchy/SelectedSquadronPanel";
import MembersModal from "@/components/hierarchy/MembersModal";
import { getGroups } from "@/services/api";
import { useState, useEffect } from "react";
import { Search, X, RotateCcw, Loader, Users, MapPin, Shield, Layers } from "lucide-react";

function SummaryCard({ label, value }) {
  return (
    <div className={cn(
      "flex flex-col rounded-xl border px-4 py-3",
      "bg-white dark:bg-neutral-900",
      "border-neutral-200 dark:border-neutral-800"
    )}>
      <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">{value}</span>
      <span className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-500">{label}</span>
    </div>
  );
}

function transformApiData(apiData) {
  if (!apiData?.airbase) return null;
  const { airbase } = apiData;
  return [
    {
      id: `airbase-${airbase.id || "pafr"}`,
      name: airbase.name || "PAFR Airbase",
      code: airbase.code || "PAFR",
      region: airbase.region || "National",
      reservists: airbase.total_reservists || 0,
      arcens: (airbase.arcens || []).map((arsen) => ({
        id: `arsen-${arsen.id}`,
        name: arsen.name || "",
        fullName: arsen.name || "",
        code: arsen.code || "",
        commander: arsen.commander || "",
        location: arsen.location || "",
        reservists: arsen.reservists || 0,
        groups: (arsen.groups || []).map((group) => ({
          id: `group-${group.id}`,
          name: group.name || "",
          code: group.code || "",
          commander: group.commander || "",
          reservists: group.reservists || 0,
          squadrons: (group.squadrons || []).map((sq) => ({
            id: `sq-${sq.id}`,
            name: sq.name || "",
            code: sq.code || "",
            status: sq.status || "active",
            members: sq.members || 0,
            specialization: sq.specialization || "",
            location: sq.location || "",
          })),
        })),
      })),
    },
  ];
}

// ── Hierarchy View (original content) ──────────────────────
function HierarchyView() {
  const [search, setSearch] = useState("");
  const [hierarchyData, setHierarchyData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [authError, setAuthError] = useState(null);
  const { resetAll, selectedSquadron, modalSquadron, closeMembersModal } = useHierarchy();

  useEffect(() => { fetchHierarchy(); }, []);

  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  const fetchHierarchy = async () => {
    try {
      const response = await getGroups({ hierarchical: true }, { skipAuthRedirect: true });
      if (response.data.status === "success") {
        const apiData = response.data.data;
        const transformed = transformApiData(apiData);
        if (transformed) setHierarchyData(transformed);
        setSummary(apiData.summary || null);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setAuthError(err.message);
        return;
      }
      console.warn("Could not load hierarchy from API:", err.message);
    }
  };

  const totalReservists = hierarchyData.reduce((a, area) => a + area.reservists, 0);
  const totalArcens = hierarchyData.reduce((a, area) => a + area.arcens.length, 0);
  const totalGroups = hierarchyData.reduce((a, area) => a + area.arcens.reduce((b, arc) => b + arc.groups.length, 0), 0);
  const totalSquadrons = hierarchyData.reduce((a, area) => a + area.arcens.reduce((b, arc) => b + arc.groups.reduce((c, g) => c + g.squadrons.length, 0), 0), 0);

  const filtered = search.trim()
    ? hierarchyData.filter((area) =>
        area.name.toLowerCase().includes(search.toLowerCase()) ||
        area.code.toLowerCase().includes(search.toLowerCase()) ||
        area.arcens.some((arc) =>
          arc.name.toLowerCase().includes(search.toLowerCase()) ||
          arc.groups.some((g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.squadrons.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
          )
        )
      )
    : hierarchyData;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Airbases" value={summary?.total_arcens ?? totalArcens} />
        <SummaryCard label="ARCENs" value={summary?.total_arcens ?? totalArcens} />
        <SummaryCard label="Groups" value={summary?.total_groups ?? totalGroups} />
        <SummaryCard label="Squadrons" value={summary?.total_squadrons ?? totalSquadrons} />
        <SummaryCard label="Reservists" value={(summary?.total_reservists ?? totalReservists).toLocaleString()} />
      </div>

      {/* Search + collapse */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full flex-1 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search area, ARCEN, group, squadron…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border py-2 pl-8 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
            )}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button onClick={resetAll}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
            "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
            "transition-all duration-150"
          )}
        >
          <RotateCcw size={12} /> Collapse All
        </button>
      </div>

      {/* Hierarchy legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-[11px] text-neutral-500 dark:text-neutral-600">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Hierarchy:</span>
        {[
          { level: "1", label: "Airbase", color: "bg-indigo-500" },
          { level: "2", label: "ARCEN", color: "bg-indigo-400" },
          { level: "3", label: "Group", color: "bg-blue-400" },
          { level: "4", label: "Squadron", color: "bg-blue-300" },
        ].map((l, i) => (
          <span key={l.level} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">›</span>}
            <span className={cn("h-2 w-2 rounded-full", l.color)} />
            <span>L{l.level}: {l.label}</span>
          </span>
        ))}
      </div>

      {/* Accordion list */}
      {authError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <p className="font-medium">Authentication Error</p>
            <p className="text-sm mt-1">{authError}</p>
          </div>
          <p className="text-xs text-red-500 dark:text-red-500 mt-2">Redirecting to login page in a few seconds…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
          <p className="text-sm text-neutral-400">No data available. Please log in to view hierarchy.</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((area) => <AreaAccordion key={area.id} area={area} />)}
        </div>
      )}

      {selectedSquadron && <SelectedSquadronPanel />}
      {modalSquadron && (
        <MembersModal
          open={!!modalSquadron}
          node={modalSquadron}
          nodeType="squadron"
          onClose={closeMembersModal}
        />
      )}
    </div>
  );
}

// ── Main Overview ────────────────────────────────────────────
function OverviewContent() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <HierarchyView />
    </div>
  );
}

export default function AirbaseOverview() {
  return (
    <HierarchyProvider>
      <OverviewContent />
    </HierarchyProvider>
  );
}