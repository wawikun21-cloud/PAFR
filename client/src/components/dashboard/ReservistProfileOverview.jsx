import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PieChart, Pie } from "recharts";
import { Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function ChartCard({ title, icon: Icon, children, className }) {
  return (
    <div className={cn(
      "rounded-2xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-4 sm:p-6",
      className
    )}>
      <div className="flex items-center gap-2.5 mb-5">
        {Icon && (
          <Icon size={15} className="text-blue-500 dark:text-blue-400" strokeWidth={1.8} />
        )}
        <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {title}
        </h3>
        <Info size={14} className="text-neutral-400 dark:text-neutral-500 ml-auto shrink-0" />
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
        {label || payload[0]?.name}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: <span className="font-bold">{p.value}{p.dataKey === "pct" ? "%" : ""}</span>
        </p>
      ))}
    </div>
  );
}

const RANK_COLORS = [
  "#6366f1", "#818cf8", "#a5b4fc",
  "#c7d2fe", "#e0e7ff", "#eef2ff",
];

function RankDistribution({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Reservist by Rank
        </p>
        <div className="flex h-36 items-center justify-center text-sm text-neutral-400">No data available</div>
      </div>
    );
  }

  const total = data.reduce((a, d) => a + (d.count || 0), 0);
  const sorted = [...data].sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
        Reservist by Rank
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 70, bottom: 4 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-neutral-400"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="rank"
            type="category"
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-neutral-400"
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Bar dataKey="count" name="Reservists" radius={[0, 5, 5, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={RANK_COLORS[i] ?? "#e0e7ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3">
        <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total</span>
        <span className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{total}</span>
      </div>
    </div>
  );
}

function ProfessionDistribution({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Profession / Occupation Distribution
        </p>
        <div className="flex h-36 items-center justify-center text-sm text-neutral-400">No data available</div>
      </div>
    );
  }

  const total = data.reduce((a, d) => a + (d.count || 0), 0);

  const PROF_CATEGORIES = [
    "Security Personnel",
    "Engineering",
    "IT / Communications",
    "Medical / Health",
    "Administrative",
    "Others"
  ];
  const PROF_COLORS = [
    "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#64748b"
  ];
  const colorFor = (name) => {
    const idx = PROF_CATEGORIES.indexOf(name);
    return PROF_COLORS[idx >= 0 ? idx : 5];
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
        Profession / Occupation Distribution
      </p>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Pie chart with total in center */}
        <div className="relative w-[130px] h-[130px] shrink-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={58}
                dataKey="count"
                nameKey="name"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorFor(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[21px] font-bold text-neutral-900 dark:text-neutral-100 tabular-nums leading-none">
              {total}
            </span>
            <span className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400 tracking-[0.5px] -mt-px">
              RESERVISTS
            </span>
          </div>
        </div>

        {/* Legends on the right side (6 items) */}
        <div className="flex-1 w-full pt-0.5">
          <div className="grid grid-cols-1 gap-y-[5px]">
            {data.map((d, i) => {
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: colorFor(d.name) }}
                  />
                  <span className="flex-1 text-neutral-600 dark:text-neutral-300 truncate" title={d.name}>
                    {d.name}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {d.count}
                  </span>
                  <span className="w-[34px] text-right text-neutral-500 dark:text-neutral-400">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReservistProfileOverview({ rankData, professionData }) {
  return (
    <ChartCard title="Reservist Profile Overview" icon={Users}>
      <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-2">
        <ProfessionDistribution data={professionData} />
        <RankDistribution data={rankData} />
      </div>
    </ChartCard>
  );
}