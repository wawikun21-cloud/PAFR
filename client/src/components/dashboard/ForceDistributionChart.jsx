import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ChartCard({ title, children, className }) {
  return (
    <div className={cn(
      "rounded-2xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-4 sm:p-6",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {title}
        </h3>
        <Info size={13} className="text-neutral-400 dark:text-neutral-500" />
      </div>
      {children}
    </div>
  );
}

export default function ForceDistributionChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard title="Force Distribution by Area">
        <div className="flex h-32 items-center justify-center text-xs text-neutral-400">No data available</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Force Distribution by Area">
      {/* Legend for the per-row distribution bars */}
      <div className="flex items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" />
          <span className="text-neutral-700 dark:text-neutral-300">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-neutral-400 dark:bg-neutral-500" />
          <span className="text-neutral-700 dark:text-neutral-300">Standby</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 dark:text-neutral-400 text-xs">
              <th className="text-left pb-0.5 font-semibold">Area</th>
              <th className="text-right pb-0.5 font-semibold">Total</th>
              <th className="text-right pb-0.5 font-semibold">Active</th>
              <th className="text-right pb-0.5 font-semibold">Standby</th>
              <th className="w-20 sm:w-28 pb-0.5 font-semibold">Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-s">
            {data.map((row) => {
              const total = row.total || 0;
              const active = row.active || 0;
              const standby = row.standby || 0;

              const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
              const standbyPct = total > 0 ? Math.round((standby / total) * 100) : 0;

              return (
                <tr key={row.area} className="text-neutral-800 dark:text-neutral-200">
                  <td className="py-1 font-medium">{row.area || "Unassigned"}</td>
                  <td className="py-1 text-right font-medium">{total.toLocaleString()}</td>
                  <td className="py-1 text-right font-semibold text-indigo-600 dark:text-indigo-400">{active}</td>
                  <td className="py-1 text-right font-medium text-neutral-500 dark:text-neutral-400">{standby}</td>

                  {/* Inline per-row bar chart with extra space from table content */}
                  <td className="py-1 pl-3 sm:pl-6">
                    <div className="flex w-[80px] sm:w-[120px] h-2.5 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${activePct}%` }}
                        title={`Active: ${active} (${activePct}%)`}
                      />
                      <div
                        className="h-full bg-neutral-400 dark:bg-neutral-500 transition-all duration-300"
                        style={{ width: `${standbyPct}%` }}
                        title={`Standby: ${standby} (${standbyPct}%)`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                      <span>{activePct}%</span>
                      <span>{standbyPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}