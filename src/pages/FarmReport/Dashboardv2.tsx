import { useEffect, useMemo, useState } from "react";
import { getSummary } from "../../hooks/farmReportAPI";
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
} from "recharts";
import TentHeatMap from "../../components/FarmReport/TentHeatMap";

type Filters = {
  farmId?: string;
  problemCategory?: string;
  status?: string;
  minSeverity?: number;
  from?: string; // ISO
  to?: string; // ISO
};

function Dashboardv2() {
  const [filters, setFilters] = useState<Filters>({});
  const [summary, setSummary] = useState<any | null>(null);

  const [selectedTentId, setSelectedTentId] = useState<string>("");

  function updateFilter<K extends keyof Filters>(k: K, v: any) {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
  }

  async function loadSummary(f: Filters) {
    const res = await getSummary(f);
    setSummary(res);
  }

  

  useEffect(() => {
    loadSummary(filters);
  }, [JSON.stringify(filters)]);

  const byTentRaw = summary?.byTent ?? [];
  const byTentBar = useMemo(
    () => byTentRaw.map((d: any) => ({ name: d.tentId, count: d.count })),
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: 16 }}>
      <h2>Pest Pattern Dashboard</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="tent Id"
          value={filters.farmId || ""}
          onChange={(e) => updateFilter("farmId", e.target.value)}
        />
        <input
          placeholder="problemCategory"
          value={filters.problemCategory || ""}
          onChange={(e) => updateFilter("problemCategory", e.target.value)}
        />
        <select
          value={filters.status || ""}
          onChange={(e) => updateFilter("status", e.target.value || undefined)}
        >
          <option value="">(any status)</option>
          <option value="unresolved">unresolved</option>
          <option value="resolved">resolved</option>
        </select>
        <input
          type="number"
          min={0}
          max={5}
          placeholder="minSeverity"
          value={filters.minSeverity ?? ""}
          onChange={(e) =>
            updateFilter(
              "minSeverity",
              e.target.value === "" ? undefined : Number(e.target.value)
            )
          }
        />
        <input
          type="datetime-local"
          onChange={(e) =>
            updateFilter(
              "from",
              e.target.value ? new Date(e.target.value).toISOString() : undefined
            )
          }
        />
        <input
          type="datetime-local"
          onChange={(e) =>
            updateFilter(
              "to",
              e.target.value ? new Date(e.target.value).toISOString() : undefined
            )
          }
        />
        <button
          onClick={() => {
            loadSummary(filters);
          }}
        >
          Apply
        </button>
        <button onClick={() => setFilters({})}>Clear</button>
      </div>

      {/* Heat Map (always-on overlay via per-area fillColor) */}
      <div style={{ border: "1px solid #eee", padding: "1rem" }}>
        <h4>Heat Map</h4>
        <TentHeatMap
          byTent={byTentRaw}
          selectedTentId={selectedTentId}
          onSelectTent={(id) => {
            setSelectedTentId(id);
            // Optional: click-to-filter
            // updateFilter("farmId", id);
          }}
          // Example: useBuckets if you prefer discrete colors
          // useBuckets
          // buckets={[
          //   { max: 0, color: "#cccccc" },
          //   { max: 1, color: "#c7f464" },
          //   { max: 3, color: "#ffd56b" },
          //   { max: 5, color: "#ff9f43" },
          //   { max: 9999, color: "#ff6b6b" },
          // ]}
        />
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 400,
            border: "1px solid #eee",
            padding: "1rem",
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h4>Trends by day</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2b7" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            height: 400,
            border: "1px solid #eee",
            padding: "1rem",
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h4>By Tents</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTentBar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#36c" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            height: 400,
            border: "1px solid #eee",
            padding: "1rem",
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h4>By Category</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#e67" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboardv2;