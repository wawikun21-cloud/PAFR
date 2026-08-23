import { useState, useEffect, useCallback } from "react";
import {
  getReadiness, getArcens, getGroupsList, getSquadrons,
} from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  ShieldCheck, Users, ChevronRight, ChevronDown, Search,
  TrendingDown, TrendingUp, AlertTriangle, Info, ArrowLeft,
  GraduationCap, ClipboardCheck, UserCheck, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────

const SCORE_COLORS = {
  excellent: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Excellent (≥90)" },
  good:      { bg: "bg-indigo-500",   text: "text-indigo-600 dark:text-indigo-400",     label: "Good (80-89)" },
  fair:      { bg: "bg-amber-500",    text: "text-amber-600 dark:text-amber-400",       label: "Fair (70-79)" },
  poor:      { bg: "bg-orange-500",   text: "text-orange-600 dark:text-orange-400",     label: "Poor (60-69)" },
  critical:  { bg: "bg-red-500",      text: "text-red-600 dark:text-red-400",           label: "Critical (<60)" },
};

function scoreColor(score) {
  if (score >= 90) return SCORE_COLORS.excellent;
  if (score >= 80) return SCORE_COLORS.good;
  if (score >= 70) return SCORE_COLORS.fair;
  if (score >= 60) return SCORE_COLORS.poor;
  return SCORE_COLORS.critical;
}

function scoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Critical";
}

function readinessBarColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 70) return "#6366f1";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

const COMP_COLORS = {
  training: "#6366f1",
  attendance: "#10b981",
  active: "#f59e0b",
};

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f97316", "#ef4444"];

// ─── Shared Components ────────────────────────────────────────────

function Card({ title, icon: Icon, badge, children, className }) {
  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} className="text-indigo-500 dark:text-indigo-400" strokeWidth={1.8} />}
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">{title}</h3>
        {badge && (
          <span className="ml-auto rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill ?? p.color }}>
          {p.name}: <span className="font-bold">{p.value}{typeof p.value === "number" ? "%" : ""}</span>
        </p>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function EmptyState({ message = "No data available" }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-neutral-400 dark:text-neutral-600">
      <Info size={20} />
      <p className="text-xs">{message}</p>
    </div>
  );
}

function ScoreBadge({ score, size = "md" }) {
  const { text } = scoreColor(score);
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";
  return <span className={cn("font-bold", sizeClass, text)}>{score}%</span>;
}
 
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Breadcrumb Navigation ────────────────────────────────────────

function Breadcrumb({ items, onNavigate }) {
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-neutral-300 dark:text-neutral-600" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── KPI Summary Strip ────────────────────────────────────────────

function KPISummary({ data }) {
  if (!data) return null;
  const kpis = [
    { label: "Avg Readiness", value: `${data.avg_readiness_score || 0}%`, icon: ShieldCheck, color: "indigo" },
    { label: "Training Part.", value: `${data.avg_training_participation || 0}%`, icon: GraduationCap, color: "blue" },
    { label: "Attendance", value: `${data.avg_attendance_rate || 0}%`, icon: ClipboardCheck, color: "emerald" },
    { label: "Active Status", value: `${data.avg_active_status || 0}%`, icon: UserCheck, color: "amber" },
    { label: "Below Threshold", value: data.below_threshold_count || 0, icon: AlertTriangle, color: "red" },
  ];

  const colorMap = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const c = colorMap[kpi.color];
        return (
          <div key={kpi.label} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", c)}>
                <Icon size={14} className={c.split(" ")[0]} strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{kpi.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Readiness Distribution Chart ─────────────────────────────────

function DistributionChart({ data, onDrillDown }) {
  if (!data || !data.distribution) return <EmptyState />;

  const chartData = data.distribution.map((b) => ({
    name: b.label,
    value: b.count,
    color: b.color,
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Card title="Readiness Distribution" icon={ShieldCheck} badge={`${total} total`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75}
                  dataKey="value"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Readiness Levels
            </p>
            {chartData.map((d) => (
              <button
                key={d.name}
                onClick={() => onDrillDown?.(d)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-400">{d.name}</span>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{d.value}</span>
                <span className="text-[10px] text-neutral-400 w-10 text-right">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </button>
            ))}
          </div>
        </div>
    </Card>
  );
}

// ─── Ranking Bar Chart ────────────────────────────────────────────

function RankingChart({ data, labelKey = "name", onItemClick, title, emptyMessage, limit = 10, showViewAll = false, onViewAll }) {
  if (!data || data.length === 0) return <EmptyState message={emptyMessage} />;

  const sorted = [...data].sort((a, b) => (b.score || b.avg_readiness_score || 0) - (a.score || b.avg_readiness_score || 0));
  const displayData = showViewAll ? sorted : sorted.slice(0, limit);
  const hasMore = !showViewAll && sorted.length > limit;

  return (
    <Card title={title} icon={ShieldCheck}>
      <div className="flex flex-col gap-2">
        {displayData.map((row, i) => {
          const score = row.score || row.avg_readiness_score || 0;
          const name = row[labelKey] || row.arsen_name || row.group_name || row.squadron_name || "Unknown";
          const { text } = scoreColor(score);
          return (
            <button
              key={i}
              onClick={() => onItemClick?.(row)}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
            >
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                i === 0 ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500"
              )}>
                {i + 1}
              </span>
              <span className="w-[100px] shrink-0 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium truncate">
                {name}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(score, 100)}%`, background: readinessBarColor(score) }}
                />
              </div>
              <span className={cn("w-[42px] shrink-0 text-right text-[11px] font-bold", text)}>
                {score}%
              </span>
              {onItemClick && <ChevronRight size={12} className="text-neutral-300 dark:text-neutral-600 shrink-0" />}
            </button>
          );
        })}
        {hasMore && (
          <button
            onClick={onViewAll}
            className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            View All ({sorted.length} squadrons)
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Component Breakdown (Radar) ──────────────────────────────────

function ComponentRadar({ data, label }) {
  if (!data) return null;

  const chartData = [
    { subject: "Training", value: parseFloat(data.avg_training_participation || data.training_participation_pct || 0), fullMark: 100 },
    { subject: "Attendance", value: parseFloat(data.avg_attendance_rate || data.attendance_rate_pct || 0), fullMark: 100 },
    { subject: "Active", value: parseFloat(data.avg_active_status || data.active_status_pct || 0), fullMark: 100 },
  ];

  return (
    <Card title={`Component Breakdown — ${label}`} icon={ShieldCheck}>
      <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "currentColor" }} className="text-neutral-500" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {chartData.map((d) => (
              <div key={d.subject} className="text-center">
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{d.value}%</p>
                <p className="text-[10px] text-neutral-500">{d.subject}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
  );
}

// ─── Comparison Bar Chart (Group/Squadron within parent) ──────────

function ComparisonChart({ data, parentName, onItemClick }) {
  if (!data || data.length === 0) return <EmptyState />;

  const chartData = [...data]
    .sort((a, b) => (b.avg_readiness_score || 0) - (a.avg_readiness_score || 0))
    .map((d) => ({
      name: d.group_name || d.squadron_name || "Unknown",
      score: d.avg_readiness_score || 0,
      training: d.avg_training_participation || 0,
      attendance: d.avg_attendance_rate || 0,
      active: d.avg_active_status || 0,
    }));

  return (
    <Card title={`Readiness Comparison — ${parentName}`} icon={ShieldCheck} badge={`${data.length} units`}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "currentColor" }} className="text-neutral-400" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="score" name="Overall" fill="#6366f1" radius={[4, 4, 0, 0]} onClick={(_, i) => onItemClick?.(data[i])} />
          <Bar dataKey="training" name="Training" fill="#818cf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="attendance" name="Attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="active" name="Active" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Individual Reservist Table ───────────────────────────────────

function ReservistTable({ data, onItemClick }) {
  if (!data || data.length === 0) return <EmptyState message="No reservists found" />;

  return (
    <Card title="Individual Readiness" icon={Users} badge={`${data.length} reservists`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-400 dark:text-neutral-600 border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left pb-2 font-medium">Name</th>
              <th className="text-left pb-2 font-medium">Rank</th>
              <th className="text-right pb-2 font-medium">Overall</th>
              <th className="text-right pb-2 font-medium">Training</th>
              <th className="text-right pb-2 font-medium">Attendance</th>
              <th className="text-right pb-2 font-medium">Active</th>
              <th className="text-left pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.map((row) => {
              const score = row.readiness_score || 0;
              const { text } = scoreColor(score);
              return (
                <tr
                  key={row.reservist_id}
                  onClick={() => onItemClick?.(row)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-2 font-medium text-neutral-800 dark:text-neutral-200">
                    {row.last_name}, {row.first_name}
                  </td>
                  <td className="py-2 text-neutral-500">{row.rank}</td>
                  <td className={cn("py-2 text-right font-bold", text)}>{score}%</td>
                  <td className="py-2 text-right text-neutral-500">{row.training_participation_pct || 0}%</td>
                  <td className="py-2 text-right text-neutral-500">{row.attendance_rate_pct || 0}%</td>
                  <td className="py-2 text-right text-neutral-500">{row.active_status_pct || 0}%</td>
                  <td className="py-2">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      row.is_active
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    )}>
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Individual Detail Panel ──────────────────────────────────────

function IndividualDetail({ data, onBack }) {
  if (!data) return null;

  const score = data.readiness_score || 0;
  const { text } = scoreColor(score);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors self-start">
        <ArrowLeft size={12} /> Back to list
      </button>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              {data.last_name}, {data.first_name}
            </h2>
            <p className="text-xs text-neutral-500">{data.rank} · {data.service_number}</p>
          </div>
          <div className="text-right">
            <p className={cn("text-3xl font-bold", text)}>{score}%</p>
            <p className="text-[10px] text-neutral-500">{scoreLabel(score)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 p-3 text-center">
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{data.training_participation_pct || 0}%</p>
            <p className="text-[10px] text-neutral-500">Training (40%)</p>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{data.attendance_rate_pct || 0}%</p>
            <p className="text-[10px] text-neutral-500">Attendance (30%)</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.active_status_pct || 0}%</p>
            <p className="text-[10px] text-neutral-500">Active (30%)</p>
          </div>
        </div>

        {data.training_history && data.training_history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Training History</p>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {data.training_history.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{t.title}</p>
                    <p className="text-[9px] text-neutral-400">{new Date(t.start_datetime).toLocaleDateString()}</p>
                  </div>
                  <span className={cn(
                    "ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                    t.status === "present" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    t.status === "absent" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                    t.status === "late" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
                  )}>
                    {t.status || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────

const LEVELS = {
  overview: "overview",
  arsen: "arsen",
  group: "group",
  squadron: "squadron",
  reservists: "reservists",
  individual: "individual",
};

export default function Analytics() {
  const [level, setLevel] = useState(LEVELS.overview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [overall, setOverall] = useState(null);
  const [arsenReadiness, setArsenReadiness] = useState([]);
  const [groupReadiness, setGroupReadiness] = useState([]);
  const [squadronReadiness, setSquadronReadiness] = useState([]);
  const [reservistReadiness, setReservistReadiness] = useState([]);
  const [distribution, setDistribution] = useState(null);

  // Navigation state
  const [selectedArsen, setSelectedArsen] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSquadron, setSelectedSquadron] = useState(null);
  const [selectedReservist, setSelectedReservist] = useState(null);
  const [arsenList, setArsenList] = useState([]);
  const [groupList, setGroupList] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllSquadrons, setShowAllSquadrons] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // ── Data Loading ──────────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overallRes, arsensRes, groupsRes, squadronsRes, reservistsRes, distRes] = await Promise.all([
        getReadiness(),
        getReadiness({ endpoint: 'arsens' }),
        getReadiness({ endpoint: 'groups' }),
        getReadiness({ endpoint: 'squadrons' }),
        getReadiness({ endpoint: 'reservists', params: { limit: 100 } }),
        getReadiness({ endpoint: 'distribution' }),
      ]);

      setOverall(overallRes.data?.data);
      setArsenReadiness(arsensRes.data?.data || []);
      setGroupReadiness(groupsRes.data?.data || []);
      setSquadronReadiness(squadronsRes.data?.data || []);
      setReservistReadiness(reservistsRes.data?.data || []);
      setDistribution(distRes.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArsenList = useCallback(async () => {
    try {
      const res = await getArcens();
      setArsenList(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load arsens:", err);
    }
  }, []);

  const loadGroupList = useCallback(async () => {
    try {
      const res = await getGroupsList();
      setGroupList(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadArsenList();
    loadGroupList();
  }, [loadOverview, loadArsenList, loadGroupList]);

  // ── Navigation Handlers ──────────────────────────────────────

  const navigateToArsen = (arsen) => {
    setSelectedArsen(arsen);
    setLevel(LEVELS.arsen);
  };

  const navigateToGroup = (group) => {
    setSelectedGroup(group);
    setLevel(LEVELS.group);
  };

  const navigateToSquadron = (squadron) => {
    setSelectedSquadron(squadron);
    setLevel(LEVELS.squadron);
  };

  const navigateToReservists = (squadron) => {
    setSelectedSquadron(squadron);
    setLevel(LEVELS.reservists);
  };

  const navigateToIndividual = async (reservist) => {
    try {
      const res = await getReadiness({ endpoint: `reservists/${reservist.reservist_id}` });
      setSelectedReservist(res.data?.data);
      setLevel(LEVELS.individual);
    } catch (err) {
      setSelectedReservist(reservist);
      setLevel(LEVELS.individual);
    }
  };

  const navigateBack = () => {
    if (level === LEVELS.individual) {
      setLevel(selectedSquadron ? LEVELS.reservists : LEVELS.squadron);
      setSelectedReservist(null);
    } else if (level === LEVELS.reservists) {
      setLevel(selectedGroup ? LEVELS.group : selectedArsen ? LEVELS.arsen : LEVELS.overview);
      setSelectedSquadron(null);
    } else if (level === LEVELS.squadron) {
      setLevel(selectedGroup ? LEVELS.group : selectedArsen ? LEVELS.arsen : LEVELS.overview);
      setSelectedSquadron(null);
    } else if (level === LEVELS.group) {
      setLevel(selectedArsen ? LEVELS.arsen : LEVELS.overview);
      setSelectedGroup(null);
    } else if (level === LEVELS.arsen) {
      setLevel(LEVELS.overview);
      setSelectedArsen(null);
    }
  };

  const navigateToOverview = () => {
    setLevel(LEVELS.overview);
    setSelectedArsen(null);
    setSelectedGroup(null);
    setSelectedSquadron(null);
    setSelectedReservist(null);
  };

  // ── Filtered Data ─────────────────────────────────────────────

  const filteredReservists = reservistReadiness.filter((r) => {
    if (selectedSquadron && r.squadron_id !== selectedSquadron.squadron_id) return false;
    if (selectedGroup && r.group_id !== selectedGroup.group_id) return false;
    if (selectedArsen && r.arsen_id !== selectedArsen.arsen_id) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        (r.first_name || "").toLowerCase().includes(s) ||
        (r.last_name || "").toLowerCase().includes(s) ||
        (r.service_number || "").toLowerCase().includes(s) ||
        (r.rank || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const filteredGroups = groupReadiness.filter((g) => {
    if (selectedArsen && g.arsen_id !== selectedArsen.arsen_id) return false;
    return true;
  });

  const filteredSquadrons = squadronReadiness.filter((s) => {
    if (selectedGroup && s.group_id !== selectedGroup.group_id) return false;
    if (selectedArsen && s.arsen_id !== selectedArsen.arsen_id) return false;
    return true;
  });

  // ── Breadcrumb Items ──────────────────────────────────────────

  const breadcrumbItems = [{ label: "Readiness Analytics", onClick: navigateToOverview }];
  if (selectedArsen) breadcrumbItems.push({ label: selectedArsen.arsen_name, onClick: () => setLevel(LEVELS.arsen) });
  if (selectedGroup) breadcrumbItems.push({ label: selectedGroup.group_name, onClick: () => setLevel(LEVELS.group) });
  if (selectedSquadron) breadcrumbItems.push({ label: selectedSquadron.squadron_name, onClick: () => setLevel(LEVELS.squadron) });
  if (level === LEVELS.reservists) breadcrumbItems.push({ label: "Reservists" });
  if (level === LEVELS.individual && selectedReservist) breadcrumbItems.push({ label: `${selectedReservist.last_name}, ${selectedReservist.first_name}` });

  // ── Render ────────────────────────────────────────────────────

  if (loading) return <LoadingState />;
  if (error) return (
    <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">{error}</div>
  );

  return (
    <div className="flex flex-col gap-5 pb-10">
      {level !== LEVELS.overview && (
        <button
          onClick={navigateBack}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
        >
          <ArrowLeft size={12} /> Back
        </button>
      )}

      {/* ── Overview Level ──────────────────────────────────── */}
      {level === LEVELS.overview && (
        <>
          <KPISummary data={overall} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DistributionChart data={distribution} />
            <RankingChart
              data={arsenReadiness}
              labelKey="arsen_name"
              title="Readiness by Arcen"
              onItemClick={navigateToArsen}
              emptyMessage="No arsen data available"
            />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <RankingChart
              data={groupReadiness}
              labelKey="group_name"
              title="Readiness by Group"
              onItemClick={navigateToGroup}
              emptyMessage="No group data available"
              limit={10}
              showViewAll={false}
              onViewAll={() => setShowAllGroups(true)}
            />
            <RankingChart
              data={squadronReadiness}
              labelKey="squadron_name"
              title="Readiness by Squadron"
              onItemClick={navigateToSquadron}
              emptyMessage="No squadron data available"
              limit={10}
              showViewAll={false}
              onViewAll={() => setShowAllSquadrons(true)}
            />
          </div>
        </>
      )}

      {/* ── Arsen Level ─────────────────────────────────────── */}
      {level === LEVELS.arsen && selectedArsen && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <Card title={selectedArsen.arsen_name} icon={ShieldCheck} badge="Arsen">
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    <ScoreBadge score={selectedArsen.avg_readiness_score || 0} size="lg" />
                    <span className="text-xs text-neutral-400 mb-1">avg readiness</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Groups</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedArsen.total_groups || 0}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Squadrons</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedArsen.total_squadrons || 0}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Reservists</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedArsen.total_reservists || 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-2">
                      <p className="text-red-400">Below Threshold</p>
                      <p className="font-bold text-red-600 dark:text-red-400">{selectedArsen.below_threshold_count || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="xl:col-span-2 min-w-0">
              <ComponentRadar
                data={selectedArsen}
                label={selectedArsen.arsen_name}
              />
            </div>
          </div>
          <ComparisonChart
            data={filteredGroups}
            parentName={selectedArsen.arsen_name}
            onItemClick={navigateToGroup}
          />
        </>
      )}

      {/* ── Group Level ─────────────────────────────────────── */}
      {level === LEVELS.group && selectedGroup && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <Card title={selectedGroup.group_name} icon={ShieldCheck} badge="Group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    <ScoreBadge score={selectedGroup.avg_readiness_score || 0} size="lg" />
                    <span className="text-xs text-neutral-400 mb-1">avg readiness</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Squadrons</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedGroup.total_squadrons || 0}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Reservists</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedGroup.total_reservists || 0}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Active</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedGroup.active_reservists || 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-2">
                      <p className="text-red-400">Below Threshold</p>
                      <p className="font-bold text-red-600 dark:text-red-400">{selectedGroup.below_threshold_count || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="xl:col-span-2 min-w-0">
              <ComponentRadar
                data={selectedGroup}
                label={selectedGroup.group_name}
              />
            </div>
          </div>
          <ComparisonChart
            data={filteredSquadrons}
            parentName={selectedGroup.group_name}
            onItemClick={navigateToSquadron}
          />
        </>
      )}

      {/* ── Squadron Level ──────────────────────────────────── */}
      {level === LEVELS.squadron && selectedSquadron && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <Card title={selectedSquadron.squadron_name} icon={ShieldCheck} badge="Squadron">
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    <ScoreBadge score={selectedSquadron.avg_readiness_score || 0} size="lg" />
                    <span className="text-xs text-neutral-400 mb-1">avg readiness</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Reservists</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedSquadron.total_reservists || 0}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2">
                      <p className="text-neutral-400">Active</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedSquadron.active_reservists || 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-2 col-span-2">
                      <p className="text-red-400">Below Threshold</p>
                      <p className="font-bold text-red-600 dark:text-red-400">{selectedSquadron.below_threshold_count || 0}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigateToReservists(selectedSquadron)}
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    <Users size={12} /> View All Reservists
                  </button>
                </div>
              </Card>
            </div>
            <div className="xl:col-span-2 min-w-0">
              <ComponentRadar
                data={selectedSquadron}
                label={selectedSquadron.squadron_name}
              />
            </div>
          </div>
          <ReservistTable
            data={filteredReservists}
            onItemClick={navigateToIndividual}
          />
        </>
      )}

      {/* ── Reservists List Level ────────────────────────────── */}
      {level === LEVELS.reservists && selectedSquadron && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, rank, or service number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
          </div>
          <ReservistTable
            data={filteredReservists}
            onItemClick={navigateToIndividual}
          />
        </>
      )}

       {/* ── Individual Detail Level ──────────────────────────── */}
       {level === LEVELS.individual && selectedReservist && (
         <IndividualDetail
           data={selectedReservist}
           onBack={navigateBack}
         />
       )}

{/* ── All Groups Modal ─────────────────────────────────── */}
        <Modal
          isOpen={showAllGroups}
          onClose={() => setShowAllGroups(false)}
          title="All Groups"
        >
          <RankingChart
            data={groupReadiness}
            labelKey="group_name"
            title=""
            onItemClick={(group) => {
              setShowAllGroups(false);
              navigateToGroup(group);
            }}
            emptyMessage="No group data available"
            showViewAll={true}
          />
        </Modal>

        {/* ── All Squadrons Modal ───────────────────────────────── */}
        <Modal
          isOpen={showAllSquadrons}
          onClose={() => setShowAllSquadrons(false)}
          title="All Squadrons"
        >
         <RankingChart
           data={squadronReadiness}
           labelKey="squadron_name"
           title=""
           onItemClick={(squadron) => {
             setShowAllSquadrons(false);
             navigateToSquadron(squadron);
           }}
           emptyMessage="No squadron data available"
           showViewAll={true}
         />
       </Modal>
     </div>
   );
 }
