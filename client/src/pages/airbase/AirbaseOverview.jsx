import { Map, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { HierarchyProvider, useHierarchy } from "@/components/hierarchy/HierarchyContext";
import AreaAccordion from "@/components/hierarchy/AreaAccordion";
import SelectedSquadronPanel from "@/components/hierarchy/SelectedSquadronPanel";
import MembersModal from "@/components/hierarchy/MembersModal";
import { getGroups, getMapSquadrons, getMapSummary } from "@/services/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, X, RotateCcw, Loader, Users, MapPin, Shield, Layers, ChevronLeft, ZoomIn } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip, Polygon, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix default marker icon ───────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ARSEN_COLORS = {
  1: "#3B82F6",
  2: "#10B981",
  3: "#F59E0B",
  4: "#8B5CF6",
  5: "#EF4444",
};

function createArsenIcon(arsenId, isSelected) {
  const color = ARSEN_COLORS[arsenId] || "#6B7280";
  const size = isSelected ? 36 : 28;
  const border = isSelected ? 4 : 3;
  return L.divIcon({
    className: "custom-arsen-icon",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:${border}px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${isSelected ? 11 : 9}px;font-family:system-ui,sans-serif;">${isSelected ? "★" : "●"}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function createSquadronIcon(isActive, isHovered) {
  const color = isActive ? "#10B981" : "#9CA3AF";
  const size = isHovered ? 22 : 16;
  return L.divIcon({
    className: "custom-squadron-icon",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Generic organizational node icon (ARSEN / Group) ──────────────
function createNodeIcon(total, color, isSelected) {
  const size = isSelected ? 42 : 34;
  const border = isSelected ? 4 : 3;
  const fontSize = isSelected ? 12 : 10;
  return L.divIcon({
    className: "custom-org-icon",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:${border}px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${fontSize}px;font-family:system-ui,sans-serif;">${total}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

// ── Reservist "hotspot" marker (aggregated by location) ───────────
// Color is a heat scale: fewer reservists → blue, more → red.
function createLocationIcon(total, maxTotal, isSelected) {
  const t = maxTotal > 0 ? Math.min(total / maxTotal, 1) : 0;
  const hue = 210 - t * 210; // 210 (blue) → 0 (red)
  const color = `hsl(${hue}, 80%, 48%)`;
  const size = isSelected ? 46 : 38;
  const fontSize = isSelected ? 13 : 11;
  return L.divIcon({
    className: "custom-location-icon",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;width:${size}px;height:${size}px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:${fontSize}px;font-family:system-ui,sans-serif;line-height:1;">${total}</span>
        </div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 12, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

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

// ── Heat-scale color (mirrors createLocationIcon) ────────────────
function heatColor(total, max) {
  const t = max > 0 ? Math.min(total / max, 1) : 0;
  const hue = 210 - t * 210; // 210 (blue) → 0 (red)
  return `hsl(${hue}, 80%, 48%)`;
}

// ── Convex hull (Andrew's monotone chain) ────────────────────────
// points: [lat, lng][]. Treats lng as x, lat as y. Returns the hull
// as [lat, lng][] (>= 3 points) or fewer points when degenerate.
function computeConvexHull(points) {
  const pts = points.map((p) => ({ x: p[1], y: p[0], lat: p[0], lng: p[1] }));
  const seen = new Set();
  const uniq = [];
  for (const p of pts) {
    const k = `${p.lat},${p.lng}`;
    if (!seen.has(k)) { seen.add(k); uniq.push(p); }
  }
  if (uniq.length < 3) return uniq.map((p) => [p.lat, p.lng]);
  const sorted = uniq.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper).map((p) => [p.lat, p.lng]);
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

// ── Inline Map Component ───────────────────────────────────────────
const MINDANAO_CENTER = [7.5, 125.0];
const MINDANAO_ZOOM = 7;

// Inline Map Component
function MindanaoMapInline() {
  const [squadrons, setSquadrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [layer, setLayer] = useState("arsen");
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [selected, setSelected] = useState(null);
  const loadInfoRef = useRef(null);

  // Aggregate squadrons into organizational + geographic layers.
  // NOTE: `Map` is shadowed by the lucide icon import, so we use plain
  // objects keyed by id/string instead of `new Map()`.
  const orgAgg = useMemo(() => {
    const arsen = {};
    const group = {};
    const location = {};
    const toNum = (v) => {
      const n = typeof v === "string" ? parseFloat(v) : v;
      return Number.isFinite(n) ? n : null;
    };
    squadrons.forEach((sq) => {
      const aId = sq.arsen?.id;
      const lat = toNum(sq.latitude);
      const lng = toNum(sq.longitude);
      if (aId != null && lat != null && lng != null) {
        if (!arsen[aId]) {
          arsen[aId] = { id: aId, name: sq.arsen.name, location: sq.arsen.location, total: 0, count: 0, sumLat: 0, sumLng: 0, groupIds: {}, squadrons: [] };
        }
        const a = arsen[aId];
        a.total += sq.total_reservists || 0; a.count += 1;
        a.sumLat += lat; a.sumLng += lng;
        a.squadrons.push(sq); a.groupIds[sq.group.id] = true;
      }
      const gId = sq.group?.id;
      if (gId != null && lat != null && lng != null) {
        if (!group[gId]) {
          group[gId] = { id: gId, name: sq.group.name, code: sq.group.code, arsenId: aId, arsenName: sq.arsen?.name, total: 0, count: 0, sumLat: 0, sumLng: 0, squadrons: [] };
        }
        const g = group[gId];
        g.total += sq.total_reservists || 0; g.count += 1;
        g.sumLat += lat; g.sumLng += lng;
        g.squadrons.push(sq);
      }
      const key = (sq.location || "").trim();
      if (key && lat != null && lng != null) {
        if (!location[key]) {
          location[key] = { id: key, name: key, total: 0, count: 0, sumLat: 0, sumLng: 0, squadrons: [] };
        }
        const l = location[key];
        l.total += sq.total_reservists || 0; l.count += 1;
        l.sumLat += lat; l.sumLng += lng;
        l.squadrons.push(sq);
      }
    });
    const finalize = (obj) => Object.values(obj).map((e) => ({
      ...e,
      lat: e.sumLat / e.count,
      lng: e.sumLng / e.count,
      groupCount: e.groupIds ? Object.keys(e.groupIds).length : undefined,
    }));
    return { arsen: finalize(arsen), group: finalize(group), location: finalize(location) };
  }, [squadrons]);

  const maxByKind = useMemo(() => ({
    arsen: Math.max(1, ...orgAgg.arsen.map((a) => a.total)),
    group: Math.max(1, ...orgAgg.group.map((g) => g.total)),
    location: Math.max(1, ...orgAgg.location.map((l) => l.total)),
  }), [orgAgg]);

  // Territory shapes (convex hull polygon, or circle fallback for < 3 points)
  // derived alongside orgAgg — no API changes. Boundaries only apply to
  // arsen / group / location since squadrons are leaf nodes.
  const territoryAgg = useMemo(() => {
    const EARTH_R = 6371000;
    const toNum = (v) => {
      const n = typeof v === "string" ? parseFloat(v) : v;
      return Number.isFinite(n) ? n : null;
    };
    const build = (list) => list.map((node) => {
      // Only keep squadrons with valid, finite coordinates.
      const validSq = node.squadrons.filter((sq) => {
        const lat = toNum(sq.latitude);
        const lng = toNum(sq.longitude);
        return lat != null && lng != null;
      });
      const pts = validSq.map((sq) => [toNum(sq.latitude), toNum(sq.longitude)]);

      let hullPoints = null;
      if (pts.length >= 3) {
        const hull = computeConvexHull(pts);
        if (hull.length >= 3) hullPoints = hull;
      }
      let circle = null;
      if (!hullPoints && pts.length > 0) {
        const clat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const clng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        let maxDist = 0;
        for (const p of pts) {
          const dLat = (p[0] - clat) * Math.PI / 180;
          const dLng = (p[1] - clng) * Math.cos((clat * Math.PI) / 180) * Math.PI / 180;
          const d = EARTH_R * Math.sqrt(dLat * dLat + dLng * dLng);
          if (d > maxDist) maxDist = d;
        }
        circle = { center: [clat, clng], radiusMeters: Math.max(maxDist * 1.15, 3000) };
      }
      return { id: node.id, kind: node.kind, name: node.name, total: node.total, hullPoints, circle, raw: node };
    });
    return {
      arsen: build(orgAgg.arsen.map((a) => ({ ...a, kind: "arsen" }))),
      group: build(orgAgg.group.map((g) => ({ ...g, kind: "group" }))),
      location: build(orgAgg.location.map((l) => ({ ...l, kind: "location" }))),
    };
  }, [orgAgg]);

  const getNode = useCallback((kind, id) => {
    if (kind === "arsen") return orgAgg.arsen.find((a) => a.id === id);
    if (kind === "group") return orgAgg.group.find((g) => g.id === id);
    if (kind === "squadron") return squadrons.find((s) => s.id === id);
    if (kind === "location") return orgAgg.location.find((l) => l.id === id);
    return null;
  }, [orgAgg, squadrons]);

  const connectionLines = useMemo(() => {
    if (!selected || selected.kind === "squadron") return [];
    const parentLat = selected.lat ?? selected.latitude;
    const parentLng = selected.lng ?? selected.longitude;
    if (parentLat == null || parentLng == null) return [];
    return selected.children
      .filter((child) => child.kind !== "squadron" || (child.lat && child.lng))
      .map((child) => {
        const childNode = getNode(child.kind, child.id);
        if (!childNode) return null;
        const cLat = childNode.lat ?? childNode.latitude;
        const cLng = childNode.lng ?? childNode.longitude;
        if (cLat == null || cLng == null) return null;
        return {
          positions: [[parentLat, parentLng], [cLat, cLng]],
          kind: child.kind,
        };
      })
      .filter(Boolean);
  }, [selected, getNode]);

  const [rawDebug, setRawDebug] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sqRes, sumRes] = await Promise.all([
          getMapSquadrons(),
          getMapSummary(),
        ]);
        const loadedSquadrons = sqRes.data?.status === "success" ? sqRes.data.data : [];
        const loadedArsenSummaries = sumRes.data?.status === "success"
          ? (sumRes.data.data || [])
          : [];
        const mindanaoArsenIds = new Set(loadedArsenSummaries.map((a) => a.id));
        const mindanaoNames = new Set(loadedArsenSummaries.map((a) => a.name).filter(Boolean));
        const mindanaoSquadrons = loadedSquadrons.filter((sq) => {
          const arsenName = sq.arsen?.name || "";
          const arsenLoc = sq.arsen?.location || "";
          return /mindanao/i.test(arsenName) || /mindanao/i.test(arsenLoc) || mindanaoArsenIds.has(sq.arsen?.id);
        });
        const hasMindanaoData = mindanaoSquadrons.length > 0;
        const displaySquadrons = hasMindanaoData ? mindanaoSquadrons : loadedSquadrons;
        loadInfoRef.current = {
          loadedSquadrons: loadedSquadrons.length,
          summaryTotal: sumRes.data?.data?.length || 0,
          summaryIds: Array.from(mindanaoArsenIds),
          summaryNames: loadedArsenSummaries.map((a) => a.name),
          mindanaoSquadrons: mindanaoSquadrons.length,
          sampleSq: loadedSquadrons[0] || null,
          sampleSummary: loadedArsenSummaries[0] || null,
          mindanaoNames: Array.from(mindanaoNames),
          usedFallback: !hasMindanaoData,
        };
        setRawDebug({
          allSquadrons: loadedSquadrons,
          allSummaries: loadedArsenSummaries,
          filteredSquadrons: mindanaoSquadrons,
        });
        setSquadrons(displaySquadrons);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load map data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Select a node (ARSEN / Group / Squadron / Location) and open the
  // drill-down summary sidebar. Children are pre-computed for the breakdown.
  const selectNode = useCallback((kind, node) => {
    let children = [];
    if (kind === "arsen") {
      children = orgAgg.group
        .filter((g) => g.arsenId === node.id)
        .map((g) => ({ kind: "group", id: g.id, name: g.name, total: g.total, count: g.count }));
    } else if (kind === "group" || kind === "location") {
      children = node.squadrons.map((sq) => ({ kind: "squadron", id: sq.id, name: sq.name, total: sq.total_reservists, count: 1 }));
    }
    const zoom = kind === "arsen" ? 9 : kind === "group" ? 10 : kind === "squadron" ? 13 : 11;
    const lat = node.lat ?? node.latitude;
    const lng = node.lng ?? node.longitude;
    const total = kind === "squadron" ? (node.total_reservists || 0) : (node.total || 0);
    setSelected({
      kind, id: node.id, name: node.name,
      total, count: node.count ?? 1,
      lat, lng, children, raw: node,
    });
    setFlyTo({ center: [lat, lng], zoom });
  }, [orgAgg]);

  const handleChildClick = useCallback((child) => {
    const node = getNode(child.kind, child.id);
    if (node) selectNode(child.kind, node);
  }, [getNode, selectNode]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setFlyTo({ center: MINDANAO_CENTER, zoom: MINDANAO_ZOOM });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading Mindanao map data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">{error}</div>
    );
  }

  if (squadrons.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">No Mindanao data available</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          The map returned 0 squadrons. This usually means the filter criteria don&apos;t match any arsen names/locations in the database, or the API returned no data.
        </p>
        <details className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
          <summary className="px-2 py-1 cursor-pointer select-none bg-neutral-100 dark:bg-neutral-700 font-semibold">Debug: API Response Data</summary>
          <div className="p-2 space-y-1">
            <p>Summary total: {loadInfoRef.current?.summaryTotal ?? "—"}</p>
            <p>Mindanao IDs found: {loadInfoRef.current?.summaryIds?.join(", ") || "none"}</p>
            <p>Names: {loadInfoRef.current?.summaryNames?.join(", ") || "—"}</p>
            <p>All squadrons: {loadInfoRef.current?.loadedSquadrons ?? "—"}</p>
            <p>Mindanao squadrons: {loadInfoRef.current?.mindanaoSquadrons ?? "—"}</p>
            {loadInfoRef.current?.usedFallback && <p className="text-amber-600 dark:text-amber-400">Used fallback filter: {loadInfoRef.current?.fallbackIds?.join(", ")}</p>}
            {rawDebug?.allSummaries?.length > 0 ? (
              <>
                <p className="mt-2 font-semibold text-neutral-700 dark:text-neutral-300">All ARSEN Summaries (server):</p>
                {rawDebug.allSummaries.map((a) => (
                  <p key={a.id}>{a.id}: {a.name} | loc: {a.location} | sq: {a.total_squadrons}</p>
                ))}
              </>
            ) : <p className="text-red-500 dark:text-red-400">No summaries returned</p>}
            {rawDebug?.allSquadrons?.length > 0 && (
              <>
                <p className="mt-2 font-semibold text-neutral-700 dark:text-neutral-300">Sample Squadron (first):</p>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(rawDebug.allSquadrons[0], null, 2)}</pre>
              </>
            )}
            {rawDebug?.allSquadrons?.length === 0 && <p className="text-red-500 dark:text-red-400">No squadrons returned from API</p>}
          </div>
        </details>
      </div>
    );
  }

  const LAYERS = [
    { key: "arsen", label: "ARSENs", icon: Shield },
    { key: "group", label: "Groups", icon: Users },
    { key: "squadron", label: "Squadrons", icon: Layers },
    { key: "location", label: "Locations", icon: MapPin },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Switch the <strong>layer</strong> to visualize ARSENs, Groups, Squadrons or Locations.
          Click any marker or <strong>shaded boundary</strong> to <strong>drill down</strong> into its personnel summary.
          Boundaries can be toggled off to reduce clutter.
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Layer switcher */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/60 p-1 styled-scroll">
            {LAYERS.map((l) => {
              const Icon = l.icon;
              const isActive = layer === l.key;
              return (
                <button key={l.key} onClick={() => setLayer(l.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}
                >
                  <Icon size={13} /> <span className="hidden sm:inline">{l.label}</span>
                </button>
              );
            })}
          </div>
          {/* Boundary layer toggle (disabled on squadron layer — no territories) */}
          <button
            onClick={() => setShowBoundaries((v) => !v)}
            disabled={layer === "squadron"}
            title={layer === "squadron" ? "Boundaries are not available at squadron level" : "Toggle territory boundary polygons"}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              layer === "squadron"
                ? "border-neutral-200 bg-neutral-100 text-neutral-300 cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-600"
                : showBoundaries
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            )}
          >
            <MapPin size={14} /> {showBoundaries ? "Boundaries On" : "Boundaries Off"}
          </button>
          {selected && (
            <button onClick={clearSelection}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={14} /> Overview
            </button>
          )}
        </div>
      </div>



      <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm h-[60vh] min-h-[360px] sm:h-[70vh] sm:min-h-[420px] lg:h-[calc(100vh-340px)] lg:min-h-[480px]">
        <MapContainer center={MINDANAO_CENTER} zoom={MINDANAO_ZOOM} className="h-full w-full z-0" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTo && <FlyTo center={flyTo.center} zoom={flyTo.zoom} />}

          {/* ── Territory boundary shapes (rendered beneath markers) ── */}
          {showBoundaries && layer !== "squadron" && (() => {
            return territoryAgg[layer].map((t) => {
              const isSel = selected?.kind === t.kind && selected?.id === t.id;
              const color = t.kind === "arsen"
              ? (ARSEN_COLORS[t.id] || "#6B7280")
              : t.kind === "group"
                ? "#3B82F6"
                : heatColor(t.total, maxByKind.location);
            const pathOptions = {
              color,
              weight: isSel ? 4 : 2.5,
              opacity: isSel ? 1 : 0.85,
              fillColor: color,
              fillOpacity: isSel ? 0.3 : 0.2,
              dashArray: isSel ? undefined : "6 4",
              interactive: true,
              bubblingMouseEvents: false,
            };
            if (t.circle) {
              return (
                <Circle key={`b-${t.kind}-${t.id}`} center={t.circle.center} radius={t.circle.radiusMeters}
                  pathOptions={pathOptions} eventHandlers={{ click: () => selectNode(t.kind, t.raw) }} />
              );
            }
            if (t.hullPoints) {
              return (
                <Polygon key={`b-${t.kind}-${t.id}`} positions={t.hullPoints}
                  pathOptions={pathOptions} eventHandlers={{ click: () => selectNode(t.kind, t.raw) }} />
              );
            }
            return null;
          });
          })()}

          {/* ── Active layer markers ── */}
          {layer === "arsen" && orgAgg.arsen.map((arsen) => (
            <Marker key={`arsen-${arsen.id}`} position={[arsen.lat, arsen.lng]}
              icon={createArsenIcon(arsen.id, selected?.kind === "arsen" && selected.id === arsen.id)}
              eventHandlers={{ click: () => selectNode("arsen", arsen) }}
              zIndexOffset={400}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                <span className="text-[12px] font-bold">{arsen.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[200px] p-1">
                  <p className="text-sm font-bold text-neutral-900 mb-1">{arsen.name}</p>
                  <p className="text-xs text-neutral-500 mb-2">{arsen.location}</p>
                  <div className="flex gap-3 text-xs text-neutral-600 mb-2">
                    <span className="flex items-center gap-1"><Users size={11} /> {arsen.total.toLocaleString()} rsrv</span>
                    <span className="flex items-center gap-1"><Layers size={11} /> {arsen.groupCount} grp</span>
                  </div>
                  <button onClick={() => selectNode("arsen", arsen)}
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <span className="flex items-center justify-center gap-1"><ZoomIn size={12} /> View Breakdown</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {layer === "group" && orgAgg.group.map((g) => (
            <Marker key={`group-${g.id}`} position={[g.lat, g.lng]}
              icon={createNodeIcon(g.total, "#3B82F6", selected?.kind === "group" && selected.id === g.id)}
              eventHandlers={{ click: () => selectNode("group", g) }}
              zIndexOffset={400}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                <span className="text-[11px] font-bold">{g.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[200px] p-1">
                  <p className="text-sm font-bold text-neutral-900 mb-1">{g.name}</p>
                  <p className="text-xs text-neutral-500 mb-2">{g.arsenName}</p>
                  <div className="flex gap-3 text-xs text-neutral-600 mb-2">
                    <span className="flex items-center gap-1"><Users size={11} /> {g.total.toLocaleString()} rsrv</span>
                    <span className="flex items-center gap-1"><Layers size={11} /> {g.count} sqdn</span>
                  </div>
                  <button onClick={() => selectNode("group", g)}
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <span className="flex items-center justify-center gap-1"><ZoomIn size={12} /> View Breakdown</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {layer === "squadron" && squadrons.map((sq) => (
            <Marker key={`sq-${sq.id}`} position={[sq.latitude, sq.longitude]}
              icon={createSquadronIcon(sq.is_active, hoveredId === sq.id)}
              eventHandlers={{
                click: () => selectNode("squadron", sq),
                mouseover: () => setHoveredId(sq.id),
                mouseout: () => setHoveredId(null),
              }}
              zIndexOffset={300}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <span className="text-[11px] font-semibold">{sq.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2.5 w-2.5 rounded-full", sq.is_active ? "bg-emerald-500" : "bg-neutral-400")} />
                    <span className="text-sm font-bold">{sq.name}</span>
                  </div>
                  <div className="space-y-0.5 text-xs text-neutral-600">
                    <p><span className="font-medium">Location:</span> {sq.location}</p>
                    <p><span className="font-medium">Specialization:</span> {sq.specialization}</p>
                    <p><span className="font-medium">Reservists:</span> {sq.total_reservists}</p>
                  </div>
                  <button onClick={() => selectNode("squadron", sq)}
                    className="mt-2 w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {layer === "location" && orgAgg.location.map((loc) => (
            <Marker key={`loc-${loc.id}`} position={[loc.lat, loc.lng]}
              icon={createLocationIcon(loc.total, maxByKind.location, selected?.kind === "location" && selected.id === loc.id)}
              eventHandlers={{ click: () => selectNode("location", loc) }}
              zIndexOffset={500}
            >
              <Tooltip direction="top" offset={[0, -40]} opacity={0.95}>
                <span className="text-[11px] font-semibold">{loc.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[220px] p-1">
                  <p className="text-sm font-bold text-neutral-900 mb-0.5">{loc.name}</p>
                  <p className="text-[11px] text-neutral-500 mb-2">{loc.count} {loc.count === 1 ? "squadron" : "squadrons"}</p>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-2">
                    <Users size={12} /> {loc.total.toLocaleString()} reservists
                  </div>
                  <button onClick={() => selectNode("location", loc)}
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    View Breakdown
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Drill-down: when an ARSEN or Group is selected, reveal its
              individual squadron positions on the map for spatial context. */}
          {selected && (selected.kind === "arsen" || selected.kind === "group") && selected.raw.squadrons.map((sq) => (
            <Marker key={`drill-${sq.id}`} position={[sq.latitude, sq.longitude]}
              icon={createSquadronIcon(sq.is_active, hoveredId === sq.id)}
              eventHandlers={{
                click: () => selectNode("squadron", sq),
                mouseover: () => setHoveredId(sq.id),
                mouseout: () => setHoveredId(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <span className="text-[11px] font-semibold">{sq.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2.5 w-2.5 rounded-full", sq.is_active ? "bg-emerald-500" : "bg-neutral-400")} />
                    <span className="text-sm font-bold">{sq.name}</span>
                  </div>
                  <div className="space-y-0.5 text-xs text-neutral-600">
                    <p><span className="font-medium">Location:</span> {sq.location}</p>
                    <p><span className="font-medium">Specialization:</span> {sq.specialization}</p>
                    <p><span className="font-medium">Reservists:</span> {sq.total_reservists}</p>
                  </div>
                  <button onClick={() => selectNode("squadron", sq)}
                    className="mt-2 w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hierarchical connection lines: parent → child groups/locations */}
          {selected && connectionLines.length > 0 && (
            <>
              {connectionLines.map((cl) => (
                <Polyline
                  key={`conn-${selected.id}-${cl.kind}`}
                  positions={cl.positions}
                  pathOptions={{
                    color: "#6366F1",
                    weight: 1.5,
                    opacity: 0.45,
                    dashArray: "5 6",
                    interactive: false,
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {/* ── Unified drill-down summary sidebar ── */}
        {selected && (() => {
          const meta = {
            arsen: { label: "ARSEN", Icon: Shield, accent: "text-indigo-600 dark:text-indigo-400" },
            group: { label: "GROUP", Icon: Users, accent: "text-blue-600 dark:text-blue-400" },
            squadron: { label: "SQUADRON", Icon: Layers, accent: "text-sky-600 dark:text-sky-400" },
            location: { label: "LOCATION", Icon: MapPin, accent: "text-emerald-600 dark:text-emerald-400" },
          }[selected.kind];
           const Icon = meta.Icon;
           const isSquadron = selected.kind === "squadron";
           const secondary = isSquadron
             ? (selected.raw.is_active ? "Active" : "Inactive")
              : `${selected.count} ${selected.count === 1 ? "unit" : "units"}`;
            const breadcrumb = (() => {
              const parts = [];
              if (selected.kind === "arsen") {
                parts.push({ label: selected.name, kind: "arsen" });
              } else if (selected.kind === "group") {
                if (selected.raw.arsenName) parts.push({ label: selected.raw.arsenName, kind: "arsen" });
                parts.push({ label: selected.name, kind: "group" });
              } else if (selected.kind === "location") {
                parts.push({ label: selected.name, kind: "location" });
              } else if (selected.kind === "squadron") {
                if (selected.raw.arsen?.name) parts.push({ label: selected.raw.arsen.name, kind: "arsen" });
                if (selected.raw.group?.name) parts.push({ label: selected.raw.group.name, kind: "group" });
                parts.push({ label: selected.name, kind: "squadron" });
              }
              return parts;
            })();
           return (
             <div className="absolute left-3 right-3 top-3 z-[1000] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:bg-neutral-900 dark:border-neutral-700 sm:left-auto sm:right-4 sm:top-4 sm:max-h-[calc(100%-2rem)] sm:w-80">
               <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
                 <div className="flex items-center gap-2 min-w-0">
                   <Icon size={15} className={cn("shrink-0", meta.accent)} />
                   <div className="min-w-0">
                     <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{selected.name}</h3>
                     <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">{meta.label}</span>
                   </div>
                 </div>
                 <button onClick={clearSelection}
                   className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                 >
                   <X size={14} />
                  </button>
                </div>

                {breadcrumb.length > 1 && (
                  <div className="border-b border-neutral-200 dark:border-neutral-700 px-3 py-1.5 flex items-center gap-1 text-[9px] text-neutral-500 dark:text-neutral-400 overflow-x-auto">
                    {breadcrumb.map((part, i) => (
                      <span key={`${part.kind}-${i}`} className="flex items-center gap-1">
                        {i > 0 && <span className="text-neutral-300 dark:text-neutral-600">›</span>}
                        <span className={cn("font-medium", part.kind === "arsen" && "text-indigo-600 dark:text-indigo-400", part.kind === "group" && "text-blue-600 dark:text-blue-400", part.kind === "squadron" && "text-sky-600 dark:text-sky-400", part.kind === "location" && "text-emerald-600 dark:text-emerald-400")}>{part.label}</span>
                      </span>
                    ))}
                  </div>
                )}

              <div className="p-3 space-y-3">
                {/* Headline personnel count */}
                <div className="rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Total Personnel (Reservists)</p>
                  <p className={cn("text-2xl font-extrabold leading-none", meta.accent)}>{selected.total.toLocaleString()}</p>
                  <p className="mt-1 text-[10px] text-neutral-500">{secondary}</p>
                </div>

                {/* Squadron (lowest level) → show details */}
                {isSquadron && (
                  <div className="rounded-lg border border-neutral-100 dark:border-neutral-700 p-2.5 space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400">Code</p>
                        <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">{selected.raw.code || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400">Specialization</p>
                        <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">{selected.raw.specialization || "—"}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><MapPin size={10} /> {selected.raw.location}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><Layers size={10} /> {selected.raw.group?.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><Shield size={10} /> {selected.raw.arsen?.name}</div>
                    </div>
                  </div>
                )}

                {/* Drill-down breakdown of members within this zone */}
                {!isSquadron && (
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Breakdown — {selected.kind === "arsen" ? "Groups" : "Squadrons"}
                    </p>
                    <div className="space-y-1 max-h-[260px] overflow-y-auto pr-0.5">
                      {selected.children.length === 0 && (
                        <p className="text-[11px] text-neutral-400">No subordinate units.</p>
                      )}
                      {selected.children.map((child) => (
                        <button key={`${child.kind}-${child.id}`} onClick={() => handleChildClick(child)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg border border-neutral-100 dark:border-neutral-700 p-2 text-left hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">{child.name}</p>
                            <p className="text-[9px] capitalize text-neutral-400">{child.kind}</p>
                          </div>
                          <span className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                            <Users size={9} /> {child.total.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px] text-neutral-400">Click a unit to drill down further →</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Legend — reflects the active layer */}
        <div className="absolute bottom-3 left-3 z-[1000] w-[45vw] max-w-[220px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-3 py-2 shadow-sm max-h-[40vh] overflow-y-auto sm:bottom-4 sm:left-4 sm:w-auto sm:max-w-none">
          {layer === "arsen" && (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">ARSEN Regions</p>
              <div className="space-y-0.5">
                {orgAgg.arsen.map((arsen) => (
                  <button key={arsen.id} onClick={() => selectNode("arsen", arsen)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left rounded px-1.5 py-0.5 transition-colors",
                      selected?.kind === "arsen" && selected.id === arsen.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ARSEN_COLORS[arsen.id] || "#6B7280" }} />
                    <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{arsen.name}</span>
                    <span className="text-[9px] text-neutral-400 ml-auto">{arsen.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {layer === "group" && (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Groups (by Reservists)</p>
              <div className="space-y-0.5">
                {[...orgAgg.group].sort((a, b) => b.total - a.total).map((g) => (
                  <button key={g.id} onClick={() => selectNode("group", g)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left rounded px-1.5 py-0.5 transition-colors",
                      selected?.kind === "group" && selected.id === g.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-blue-500" />
                    <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{g.name}</span>
                    <span className="text-[9px] text-neutral-400 ml-auto">{g.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {layer === "squadron" && (
            <div className="space-y-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Squadron Status</p>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-400" /> Inactive
              </div>
            </div>
          )}

          {layer === "location" && (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Reservist Hotspots</p>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] text-neutral-400">Low</span>
                <span className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, hsl(210,80%,48%), hsl(120,80%,45%), hsl(45,90%,50%), hsl(0,80%,48%))" }} />
                <span className="text-[9px] text-neutral-400">High</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {[...orgAgg.location].sort((a, b) => b.total - a.total).map((loc) => (
                  <button key={loc.id} onClick={() => selectNode("location", loc)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left rounded px-1.5 py-0.5 transition-colors",
                      selected?.kind === "location" && selected.id === loc.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <MapPin size={10} className="shrink-0 text-neutral-400" />
                    <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{loc.name}</span>
                    <span className="text-[9px] text-neutral-400 ml-auto">{loc.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
 }

// ── Hierarchy View (original content) ──────────────────────────────
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

// ── Main Overview with tabs ────────────────────────────────────────
function OverviewContent() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tab switcher */}
       <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/60 p-1 w-fit">
         <button
           onClick={() => setActiveTab("map")}
           className={cn(
             "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
             activeTab === "map"
               ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
               : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
           )}
         >
           <Map size={13} /> Mindanao Map
         </button>
         <button
           onClick={() => setActiveTab("hierarchy")}
           className={cn(
             "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
             activeTab === "hierarchy"
               ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
               : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
           )}
         >
           <List size={13} /> Hierarchy
         </button>
       </div>

      {activeTab === "hierarchy" ? <HierarchyView /> : <MindanaoMapInline />}
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