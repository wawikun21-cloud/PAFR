import { useState, useEffect } from "react";
import { ClipboardCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function ChartCard({ children, className }) {
  return (
    <div className={cn(
      "rounded-2xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      {children}
    </div>
  );
}

export default function AttendanceAnalytics() {
  const [squadrons, setSquadrons] = useState([]);
  const [topReservists, setTopReservists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArsen, setSelectedArsen] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [sqRes, topRes] = await Promise.all([
          fetch(`${API_BASE}/readiness/squadrons`, { headers }),
          fetch(`${API_BASE}/readiness/reservists?sort_by=attendance_rate_pct&sort_order=desc&limit=5`, { headers })
        ]);
        const [sqJson, topJson] = await Promise.all([sqRes.json(), topRes.json()]);
        if (sqJson.status === "success" && sqJson.data) setSquadrons(sqJson.data);
        else setSquadrons([]);
        if (topJson.status === "success" && topJson.data) setTopReservists(topJson.data);
        else setTopReservists([]);
      } catch (err) {
        setSquadrons([]);
        setTopReservists([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const arsenOptions = ["All", ...new Set(squadrons.map((s) => s.arsen_name).filter(Boolean))];

  const filtered = squadrons.filter((row) =>
    selectedArsen === "All" || row.arsen_name === selectedArsen
  );

  const overallRate = filtered.length
    ? (filtered.reduce((sum, r) => sum + (Number(r.avg_attendance_rate) || 0), 0) / filtered.length).toFixed(1)
    : "0";

  const sorted = [...filtered].sort((a, b) => (Number(b.avg_attendance_rate) || 0) - (Number(a.avg_attendance_rate) || 0));
  const displayRows = sorted.slice(0, 5);

  return (
    <ChartCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={15} className="text-emerald-500" />
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Attendance Analytics
          </h3>
          <Info size={14} className="text-neutral-400" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedArsen}
            onChange={(e) => setSelectedArsen(e.target.value)}
            className="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {arsenOptions.map((a) => (
              <option key={a} value={a}>{a === "All" ? "All Arsens" : a}</option>
            ))}
          </select>
          <div className="text-neutral-500 dark:text-neutral-400">
            {filtered.length} squadrons
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">Average Attendance Rate</div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{overallRate}%</div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm text-neutral-400">Loading...</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Top 5 Reservists (Overall) */}
          <div className="lg:w-1/2">
            {topReservists.length > 0 ? (
              <div>
                <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">Top 5 Reservists (Overall)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 dark:text-neutral-400 text-xs border-b border-neutral-100 dark:border-neutral-800">
                        <th className="text-left pb-2 font-semibold">Reservist</th>
                        <th className="text-right pb-2 font-semibold w-16">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {topReservists.map((r, idx) => {
                        const rate = Math.round(Number(r.attendance_rate_pct) || 0);
                        const color = rate >= 90 ? "#10b981" : rate >= 80 ? "#6366f1" : rate >= 70 ? "#f59e0b" : "#ef4444";
                        const name = `${r.last_name || r.first_name}${r.rank ? ` (${r.rank})` : ''}`;
                        return (
                          <tr key={idx} className="text-neutral-800 dark:text-neutral-200">
                            <td className="py-1 pr-2 truncate max-w-[200px]">{name}</td>
                            <td className="py-1 w-16 text-right font-semibold" style={{ color }}>{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400">No top reservists data</div>
            )}
          </div>

          {/* Right: Squadron table (Arsen filtered) */}
          <div className="lg:w-1/2">
            {displayRows.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500 dark:text-neutral-400 text-xs border-b border-neutral-100 dark:border-neutral-800">
                        <th className="text-left pb-2 font-semibold">Squadron</th>
                        <th className="text-right pb-2 font-semibold w-16">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {displayRows.map((row, idx) => {
                        const rate = Math.round(Number(row.avg_attendance_rate) || 0);
                        const color = rate >= 90 ? "#10b981" : rate >= 80 ? "#6366f1" : rate >= 70 ? "#f59e0b" : "#ef4444";
                        return (
                          <tr key={idx} className="text-neutral-800 dark:text-neutral-200">
                            <td className="py-1 pr-2 text-sm truncate max-w-[200px]">{row.squadron_name || row.name}</td>
                            <td className="py-1 w-16 text-right font-semibold" style={{ color }}>{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sorted.length > 5 && (
                  <div className="text-[10px] text-neutral-400 mt-1">Showing top 5 of {filtered.length}</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-neutral-400">No squadron data</div>
            )}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
