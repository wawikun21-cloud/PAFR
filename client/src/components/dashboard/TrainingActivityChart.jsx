import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Info, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function ChartCard({ title, icon: Icon, children, className }) {
  return (
    <div className={cn(
      "rounded-2xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-5",
      className
    )}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={15} className="text-indigo-500 dark:text-indigo-400" strokeWidth={1.8} />}
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {title}
          </h3>
          <Info size={14} className="text-neutral-400 dark:text-neutral-500 ml-auto shrink-0" />
        </div>
      )}
      {children}
    </div>
  );
}



export default function TrainingActivityChart() {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArsen, setSelectedArsen] = useState("All");

  // Fetch real training stats from backend (current year, by Arsen → Group → Squadron)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/trainings/stats`, { headers });
        const json = await res.json();
        if (json.success) {
          setHierarchyData(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load training stats', err);
        setHierarchyData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Unique Arsens for the filter
  const arsenOptions = ["All", ...new Set(hierarchyData.map(d => d.arsen_name))];

  // Filter data by selected Arsen only
  const filteredData = hierarchyData.filter(row => {
    return selectedArsen === "All" || row.arsen_name === selectedArsen;
  });

  // Bar chart: Trainings by Group within the selected Arsen (or all if "All")
  const groupedByGroup = filteredData.reduce((acc, row) => {
    if (!acc[row.group_name]) acc[row.group_name] = 0;
    acc[row.group_name] += row.trainings;
    return acc;
  }, {});

  const barChartData = Object.entries(groupedByGroup).map(([group, trainings]) => ({
    group,
    trainings,
  }));

  // Top squadrons under the selected Arsen (across all its groups)
  const topSquadrons = [...filteredData]
    .sort((a, b) => b.trainings - a.trainings)
    .slice(0, 6);

  const totalSelected = filteredData.reduce((sum, row) => sum + row.trainings, 0);

  return (
    <ChartCard>
      {/* Custom header with title on left + filters on right */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Title + Icon */}
        <div className="flex items-center gap-2">
          <Dumbbell size={15} className="text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Training Activity
          </h3>
          <Info size={14} className="text-neutral-400 dark:text-neutral-500" />
        </div>

        {/* Right: Arsen filter only */}
        <div className="flex items-center gap-2 text-[10px]">
          <select
            value={selectedArsen}
            onChange={(e) => setSelectedArsen(e.target.value)}
            className="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {arsenOptions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        {/* Left: Horizontal Bar Chart - pushed further left */}
        <div className="xl:w-[50%]">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Trainings by Group (This Year)
          </div>

          {loading ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-neutral-400">
              Loading training data...
            </div>
           ) : barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barChartData}
                layout="horizontal"
                margin={{ top: 5, right: 15, left: -40, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-800" />
                <XAxis dataKey="group" 
                  type="category" 
                  angle={-90} 
                  textAnchor="end" 
                  height={90}
                  interval={0}
                  tick={{ fontSize: 10 }} />
                <YAxis type="number" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e5e5',
                    background: 'white',
                  }}
                />
                <Bar
                  dataKey="trainings"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Trainings"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-neutral-400">
              No training data for selected filters
            </div>
          )}
        </div>

        {/* Right: Top Squadrons Table */}
        <div className="xl:w-2/5">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Top Conducting Squadrons
          </div>

          <div className="overflow-hidden">
            <table className="w-[200px] text-xs">
              <thead className="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-300">Squadron</th>
                  <th className="text-right py-2.5 px-4 font-medium text-neutral-600 dark:text-neutral-300">Trainings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {topSquadrons.length > 0 ? (
                  <>
                    {topSquadrons.map((squadron, index) => (
                      <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="py-2.5 px-4 text-neutral-800 dark:text-neutral-200">
                          {squadron.squadron_name}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className=" tabular-nums w-8 text-right text-neutral-900 dark:text-neutral-100">
                              {squadron.trainings}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      <td className="py-2.5 px-4 text-neutral-800 dark:text-neutral-200">Total</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                        {totalSelected}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-sm text-neutral-400">
                      No squadrons found for selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
