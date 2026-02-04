// src/pages/FarmReport/Dashboardv2.tsx
import { useEffect, useMemo, useState } from "react";
import { getSummary, listReports, updateReport } from "../../hooks/farmReportAPI";
import {
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

const COLORS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
];

// Helper to safely parse severity as number
function parseSeverity(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export default function Dashboardv2() {
  const [filters, setFilters] = useState<Filters>({});
  const [summary, setSummary] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTentId, setSelectedTentId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null); // tracks which report is being updated

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

  async function handleMarkResolved(id: string) {
    setUpdating(id);
    try {
      await updateReport({ id, updates: { status: "resolved" } });
      await loadData(filters); // refresh data
    } catch (err) {
      console.error("Failed to update:", err);
      alert("Failed to mark as resolved");
    } finally {
      setUpdating(null);
    }
  }

  async function handleUpdateSeverity(id: string, newSeverity: number) {
    setUpdating(id);
    try {
      await updateReport({ id, updates: { severity: newSeverity } });
      await loadData(filters);
    } catch (err) {
      console.error("Failed to update:", err);
      alert("Failed to update severity");
    } finally {
      setUpdating(null);
    }
  }

  // Computed stats
  const stats = useMemo(() => {
    const total = summary?.total || 0;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const unresolved = reports.filter((r) => r.status === "unresolved").length;
    const totalSeverity = reports.reduce(
      (sum, r) => sum + parseSeverity(r.severity),
      0
    );
    const avgSeverity =
      reports.length > 0 ? (totalSeverity / reports.length).toFixed(1) : "0";
    const criticalCount = reports.filter(
      (r) => parseSeverity(r.severity) >= 4
    ).length;
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

  // Severity Distribution Analysis
  const severityDistribution = useMemo(() => {
    const dist = [
      { level: 1, label: "Minor", count: 0, color: "bg-green-500" },
      { level: 2, label: "Low", count: 0, color: "bg-lime-500" },
      { level: 3, label: "Moderate", count: 0, color: "bg-yellow-500" },
      { level: 4, label: "High", count: 0, color: "bg-orange-500" },
      { level: 5, label: "Critical", count: 0, color: "bg-red-500" },
    ];
    reports.forEach((r) => {
      const sev = parseSeverity(r.severity);
      const idx = Math.min(Math.max(Math.round(sev) - 1, 0), 4);
      dist[idx].count++;
    });
    return dist.map((d) => ({
      ...d,
      percentage:
        reports.length > 0
          ? ((d.count / reports.length) * 100).toFixed(1)
          : "0",
    }));
  }, [reports]);

  // Tent Risk Analysis
  const tentRiskAnalysis = useMemo(() => {
    const tentMap = new Map<
      string,
      { count: number; totalSeverity: number; unresolved: number }
    >();

    reports.forEach((r) => {
      const tentId = r.tentId || "Unknown";
      const sev = parseSeverity(r.severity);
      const existing = tentMap.get(tentId) || {
        count: 0,
        totalSeverity: 0,
        unresolved: 0,
      };
      existing.count++;
      existing.totalSeverity += sev;
      if (r.status === "unresolved") existing.unresolved++;
      tentMap.set(tentId, existing);
    });

    return Array.from(tentMap.entries())
      .map(([tentId, data]) => {
        const avgSev = data.totalSeverity / data.count;
        const unresolvedRatio = data.unresolved / data.count;
        return {
          tentId,
          totalIssues: data.count,
          avgSeverity: avgSev.toFixed(1),
          unresolvedCount: data.unresolved,
          resolutionRate:
            (((data.count - data.unresolved) / data.count) * 100).toFixed(0) +
            "%",
          riskScore: (
            avgSev *
            Math.log2(data.count + 1) *
            (1 + unresolvedRatio)
          ).toFixed(1),
        };
      })
      .sort((a, b) => parseFloat(b.riskScore) - parseFloat(a.riskScore))
      .slice(0, 10);
  }, [reports]);

  // Category Performance Matrix
  const categoryPerformance = useMemo(() => {
    const catMap = new Map<
      string,
      { count: number; totalSeverity: number; resolved: number }
    >();

    reports.forEach((r) => {
      const cat = r.problemCategory || "Other";
      const sev = parseSeverity(r.severity);
      const existing = catMap.get(cat) || {
        count: 0,
        totalSeverity: 0,
        resolved: 0,
      };
      existing.count++;
      existing.totalSeverity += sev;
      if (r.status === "resolved") existing.resolved++;
      catMap.set(cat, existing);
    });

    return Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        totalIssues: data.count,
        avgSeverity: (data.totalSeverity / data.count).toFixed(1),
        resolved: data.resolved,
        unresolved: data.count - data.resolved,
        resolutionRate: ((data.resolved / data.count) * 100).toFixed(0) + "%",
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues);
  }, [reports]);

  // Critical Issues Requiring Attention
  const criticalIssues = useMemo(() => {
    return reports
      .filter(
        (r) => parseSeverity(r.severity) >= 4 && r.status === "unresolved"
      )
      .sort(
        (a, b) =>
          parseSeverity(b.severity) - parseSeverity(a.severity) ||
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )
      .slice(0, 10);
  }, [reports]);

  // Rack Hotspots Analysis
  const rackHotspots = useMemo(() => {
    const rackMap = new Map<
      string,
      { count: number; tents: Set<string>; totalSeverity: number }
    >();

    reports.forEach((r) => {
      const rackId = r.rackId || "Unknown";
      const sev = parseSeverity(r.severity);
      const existing = rackMap.get(rackId) || {
        count: 0,
        tents: new Set(),
        totalSeverity: 0,
      };
      existing.count++;
      existing.totalSeverity += sev;
      if (r.tentId) existing.tents.add(r.tentId);
      rackMap.set(rackId, existing);
    });

    return Array.from(rackMap.entries())
      .map(([rackId, data]) => ({
        rackId,
        issueCount: data.count,
        affectedTents: data.tents.size,
        avgSeverity: (data.totalSeverity / data.count).toFixed(1),
      }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 10);
  }, [reports]);

  // Weekly Trend Comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = reports.filter((r) => new Date(r.dateTime) >= oneWeekAgo);
    const lastWeek = reports.filter(
      (r) =>
        new Date(r.dateTime) >= twoWeeksAgo && new Date(r.dateTime) < oneWeekAgo
    );

    const calcStats = (arr: any[]) => {
      const totalSev = arr.reduce(
        (sum, r) => sum + parseSeverity(r.severity),
        0
      );
      return {
        count: arr.length,
        avgSeverity: arr.length > 0 ? (totalSev / arr.length).toFixed(1) : "0",
        resolved: arr.filter((r) => r.status === "resolved").length,
        critical: arr.filter((r) => parseSeverity(r.severity) >= 4).length,
      };
    };

    const thisStats = calcStats(thisWeek);
    const lastStats = calcStats(lastWeek);

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const change = ((curr - prev) / prev) * 100;
      return (change >= 0 ? "+" : "") + change.toFixed(0) + "%";
    };

    return [
      {
        metric: "Total Issues",
        thisWeek: thisStats.count,
        lastWeek: lastStats.count,
        change: calcChange(thisStats.count, lastStats.count),
      },
      {
        metric: "Avg Severity",
        thisWeek: thisStats.avgSeverity,
        lastWeek: lastStats.avgSeverity,
        change: calcChange(
          parseFloat(thisStats.avgSeverity),
          parseFloat(lastStats.avgSeverity)
        ),
      },
      {
        metric: "Resolved",
        thisWeek: thisStats.resolved,
        lastWeek: lastStats.resolved,
        change: calcChange(thisStats.resolved, lastStats.resolved),
      },
      {
        metric: "Critical (4+)",
        thisWeek: thisStats.critical,
        lastWeek: lastStats.critical,
        change: calcChange(thisStats.critical, lastStats.critical),
      },
    ];
  }, [reports]);

  // Category x Severity Matrix
  const categorySeverityMatrix = useMemo(() => {
    const matrix = new Map<string, number[]>();
    const categories = new Set<string>();

    reports.forEach((r) => {
      const cat = r.problemCategory || "Other";
      const sev = parseSeverity(r.severity);
      categories.add(cat);
      if (!matrix.has(cat)) matrix.set(cat, [0, 0, 0, 0, 0]);
      const arr = matrix.get(cat)!;
      const idx = Math.min(Math.max(Math.round(sev) - 1, 0), 4);
      arr[idx]++;
    });

    return Array.from(categories).map((cat) => ({
      category: cat,
      severity: matrix.get(cat) || [0, 0, 0, 0, 0],
    }));
  }, [reports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              onChange={(e) =>
                updateFilter("status", e.target.value || undefined)
              }
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
        {/* Heat Map */}
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
                    <SeverityBadge severity={parseSeverity(r.severity)} />
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

      {/* Weekly Comparison + Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📅</span> Week-over-Week Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Metric
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    This Week
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    Last Week
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyComparison.map((row) => (
                  <tr
                    key={row.metric}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                      {row.metric}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {row.thisWeek}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {row.lastWeek}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <TrendBadge value={row.change} metric={row.metric} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📊</span> Severity Distribution
          </h3>
          <div className="space-y-3">
            {severityDistribution.map((item) => (
              <div key={item.level} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">{item.label}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-700">
                  {item.count}{" "}
                  <span className="text-gray-400">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert Table */}
      {criticalIssues.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 mb-6">
          <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
            <span>🚨</span> Critical Issues Requiring Immediate Attention
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-100">
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
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {criticalIssues.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-red-50 hover:bg-red-50 transition"
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
                      <SeverityBadge severity={parseSeverity(r.severity)} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {r.description || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleMarkResolved(r.id)}
                        disabled={updating === r.id}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {updating === r.id ? "..." : "✓ Resolve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tent Risk Analysis Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>⚡</span> Tent Risk Analysis
          <span className="text-xs font-normal text-gray-400 ml-2">
            (Risk Score = Avg Severity × log₂(Issues+1) × Unresolved Factor)
          </span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tent ID
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Total Issues
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Avg Severity
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Unresolved
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Resolution Rate
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Risk Score
                </th>
              </tr>
            </thead>
            <tbody>
              {tentRiskAnalysis.map((row, i) => (
                <tr
                  key={row.tentId}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-4 text-sm text-gray-500">#{i + 1}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">
                    {row.tentId}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">
                    {row.totalIssues}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <SeverityBadge severity={parseFloat(row.avgSeverity)} />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">
                    {row.unresolvedCount}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${parseInt(row.resolutionRate) >= 80
                        ? "bg-green-100 text-green-700"
                        : parseInt(row.resolutionRate) >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {row.resolutionRate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${parseFloat(row.riskScore) >= 5
                        ? "bg-red-100 text-red-700"
                        : parseFloat(row.riskScore) >= 3
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                        }`}
                    >
                      {row.riskScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tentRiskAnalysis.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* Category Performance + Rack Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🏷️</span> Category Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">
                    Category
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Total
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Avg Sev
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Resolved
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryPerformance.map((row) => (
                  <tr
                    key={row.category}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-3 text-sm font-medium text-gray-800 capitalize">
                      {row.category}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 text-right">
                      {row.totalIssues}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <SeverityBadge severity={parseFloat(row.avgSeverity)} />
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 text-right">
                      {row.resolved}/{row.totalIssues}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${parseInt(row.resolutionRate) >= 80
                          ? "bg-green-100 text-green-700"
                          : parseInt(row.resolutionRate) >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {row.resolutionRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🔥</span> Rack Hotspots
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">
                    Rack ID
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Issues
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Tents Affected
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600">
                    Avg Severity
                  </th>
                </tr>
              </thead>
              <tbody>
                {rackHotspots.map((row) => (
                  <tr
                    key={row.rackId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-3 text-sm font-medium text-gray-800">
                      {row.rackId}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 text-right">
                      {row.issueCount}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 text-right">
                      {row.affectedTents}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <SeverityBadge severity={parseFloat(row.avgSeverity)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rackHotspots.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                No data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category x Severity Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📐</span> Category × Severity Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Category
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-green-600">
                  1
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-lime-600">
                  2
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-yellow-600">
                  3
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-orange-600">
                  4
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-red-600">
                  5
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {categorySeverityMatrix.map((row) => {
                const total = row.severity.reduce((a, b) => a + b, 0);
                return (
                  <tr
                    key={row.category}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 capitalize">
                      {row.category}
                    </td>
                    {row.severity.map((count, i) => (
                      <td key={i} className="py-3 px-3 text-center">
                        {count > 0 ? (
                          <span
                            className={`inline-block min-w-6 px-2 py-1 rounded text-xs font-medium ${i === 0
                              ? "bg-green-100 text-green-700"
                              : i === 1
                                ? "bg-lime-100 text-lime-700"
                                : i === 2
                                  ? "bg-yellow-100 text-yellow-700"
                                  : i === 3
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center text-sm font-semibold text-gray-700">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Affected Tents Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>🏕️</span> Top 10 Affected Tents
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTentBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
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

      {/* All Reports Table */}
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
                    <select
                      value={parseSeverity(r.severity)}
                      onChange={(e) => handleUpdateSeverity(r.id, Number(e.target.value))}
                      disabled={updating === r.id}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <option key={s} value={s}>
                          {s}/5
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() =>
                        handleMarkResolved(r.id).then(() => {
                          if (r.status === "resolved") {
                            // If already resolved, you might want to unresolve
                            updateReport({ id: r.id, updates: { status: "unresolved" } }).then(
                              () => loadData(filters)
                            );
                          }
                        })
                      }
                      disabled={updating === r.id}
                      className="disabled:opacity-50"
                    >
                      <StatusBadge status={r.status} />
                    </button>
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
      className={`bg-white rounded-xl shadow-sm border p-4 ${alert ? "border-red-300 bg-red-50" : "border-gray-200"
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
  const rounded = Math.round(severity);
  const clamped = Math.min(Math.max(rounded, 1), 5);
  const colors: Record<number, string> = {
    1: "bg-green-100 text-green-700",
    2: "bg-lime-100 text-lime-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-orange-100 text-orange-700",
    5: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[clamped]}`}
    >
      {Number.isInteger(severity) ? severity : severity.toFixed(1)}/5
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isResolved = status === "resolved";
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${isResolved
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-700"
        }`}
    >
      {status}
    </span>
  );
}

function TrendBadge({ value, metric }: { value: string; metric: string }) {
  const isPositive = value.startsWith("+");
  const isZero = value === "0%";
  const isGood = metric === "Resolved" ? isPositive : !isPositive;

  if (isZero) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {value}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${isGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
    >
      {value}
    </span>
  );
}