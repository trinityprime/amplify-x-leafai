// src/pages/FarmReport/Dashboardv2.tsx
import { useEffect, useMemo, useState } from "react";
import { getSummary, listReports } from "../../hooks/farmReportAPI";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import TentHeatMap from "../../components/FarmReport/TentHeatMap";

type Filters = {
  farmId?: string;
  problemCategory?: string;
  status?: string;
  minSeverity?: number;
  from?: string;
  to?: string;
};

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];

export default function Dashboardv2() {
  const [filters, setFilters] = useState<Filters>({});
  const [summary, setSummary] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTentId, setSelectedTentId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  function updateFilter<K extends keyof Filters>(k: K, v: any) {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
  }

  async function loadData(f: Filters) {
    setLoading(true);
    try {
      const [summaryRes, reportsRes] = await Promise.all([
        getSummary(f),
        listReports({ ...f, limit: 100 }),
      ]);
      setSummary(summaryRes);
      setReports(reportsRes?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(filters);
  }, []);

  const applyFilters = () => loadData(filters);
  const clearFilters = () => {
    setFilters({});
    loadData({});
  };

  // Computed stats
  const stats = useMemo(() => {
    const total = summary?.total || 0;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const unresolved = reports.filter((r) => r.status === "unresolved").length;
    const avgSeverity =
      reports.length > 0
        ? (
            reports.reduce((sum, r) => sum + (r.severity || 0), 0) / reports.length
          ).toFixed(1)
        : "0";
    const criticalCount = reports.filter((r) => r.severity >= 4).length;
    return { total, resolved, unresolved, avgSeverity, criticalCount };
  }, [summary, reports]);

  const byTentRaw = summary?.byTent ?? [];
  const byTentBar = useMemo(
    () =>
      byTentRaw
        .map((d: any) => ({ name: d.tentId, count: d.count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10),
    [byTentRaw]
  );

  const byCategory = useMemo(
    () =>
      (summary?.byCategory || []).map((d: any) => ({
        name: d.problemCategory,
        count: d.count,
      })),
    [summary]
  );

  const timeseries = summary?.timeseries || [];

  const statusData = useMemo(
    () => [
      { name: "Resolved", value: stats.resolved, color: "#10b981" },
      { name: "Unresolved", value: stats.unresolved, color: "#ef4444" },
    ],
    [stats]
  );

  const recentReports = useMemo(
    () =>
      [...reports]
        .sort(
          (a, b) =>
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        )
        .slice(0, 5),
    [reports]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          🌿 Pest Pattern Analysis Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Monitor pest trends, analyze patterns, and make informed decisions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Reports"
          value={stats.total}
          icon="📊"
          color="bg-blue-500"
        />
        <StatCard
          title="Unresolved"
          value={stats.unresolved}
          icon="⚠️"
          color="bg-red-500"
          alert={stats.unresolved > 10}
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon="✅"
          color="bg-emerald-500"
        />
        <StatCard
          title="Avg Severity"
          value={stats.avgSeverity}
          icon="📈"
          color="bg-amber-500"
          suffix="/5"
        />
        <StatCard
          title="Critical (4+)"
          value={stats.criticalCount}
          icon="🚨"
          color="bg-purple-500"
          alert={stats.criticalCount > 0}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <span>🔍</span> Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showFilters ? "Hide" : "Show"} Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input
              placeholder="Tent ID"
              value={filters.farmId || ""}
              onChange={(e) => updateFilter("farmId", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <input
              placeholder="Category"
              value={filters.problemCategory || ""}
              onChange={(e) => updateFilter("problemCategory", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <select
              value={filters.status || ""}
              onChange={(e) => updateFilter("status", e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">Any Status</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
            <input
              type="number"
              min={0}
              max={5}
              placeholder="Min Severity"
              value={filters.minSeverity ?? ""}
              onChange={(e) =>
                updateFilter(
                  "minSeverity",
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <input
              type="date"
              onChange={(e) =>
                updateFilter(
                  "from",
                  e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Heat Map - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🗺️</span> Farm Heat Map
          </h3>
          <TentHeatMap
            byTent={byTentRaw}
            selectedTentId={selectedTentId}
            onSelectTent={setSelectedTentId}
          />
        </div>

        {/* Status Pie + Recent Reports */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>📊</span> Status Breakdown
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>🕐</span> Recent Reports
            </h3>
            <div className="space-y-3">
              {recentReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {r.tentId} - {r.rackId}
                    </p>
                    <p className="text-xs text-gray-500">{r.problemCategory}</p>
                  </div>
                  <div className="text-right">
                    <SeverityBadge severity={r.severity} />
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.dateTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentReports.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  No recent reports
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📈</span> Pest Incidents Over Time
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🐛</span> Issues by Category
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byCategory.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Affected Tents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>🏕️</span> Top 10 Affected Tents
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTentBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📋</span> All Reports ({reports.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tent
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Rack
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Category
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Severity
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 20).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(r.dateTime).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">
                    {r.tentId}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{r.rackId}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {r.problemCategory}
                  </td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length > 20 && (
            <p className="text-center text-sm text-gray-400 py-4">
              Showing 20 of {reports.length} reports
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  icon,
  color,
  suffix = "",
  alert = false,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  suffix?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 ${
        alert ? "border-red-300 bg-red-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <div className={`w-2 h-2 rounded-full ${color}`} />
      </div>
      <p className="text-2xl font-bold text-gray-800 mt-2">
        {value}
        <span className="text-sm font-normal text-gray-400">{suffix}</span>
      </p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: number }) {
  const colors: Record<number, string> = {
    1: "bg-green-100 text-green-700",
    2: "bg-lime-100 text-lime-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-orange-100 text-orange-700",
    5: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        colors[severity] || "bg-gray-100 text-gray-700"
      }`}
    >
      {severity}/5
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isResolved = status === "resolved";
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        isResolved
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}