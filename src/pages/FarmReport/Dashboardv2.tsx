import { useEffect, useMemo, useState } from "react";
import { getSummary, listReports } from "../../hooks/api";
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

type Filters = {
    farmZone?: string;
    problemCategory?: string;
    status?: string;
    minSeverity?: number;
    from?: string; // ISO
    to?: string; // ISO
};

function Dashboardv2() {
    const [filters, setFilters] = useState<Filters>({});
    const [summary, setSummary] = useState<any | null>(null);
    const [list, setList] = useState<any>({ items: [], count: 0, cursor: null });
    const [loadingList, setLoadingList] = useState(false);

    function updateFilter<K extends keyof Filters>(k: K, v: any) {
        setFilters((f) => ({ ...f, [k]: v || undefined }));
    }

    async function loadSummary(f: Filters) {
        const res = await getSummary(f);
        setSummary(res);
    }

    async function loadList(f: Filters, cursor?: string | null) {
        setLoadingList(true);
        try {
            const res = await listReports({
                ...f,
                limit: 50,
                cursor: cursor ?? undefined,
            });

            // Log once to verify shape
            console.log();

            // Some Lambdas wrap the payload as { body: "JSON" } or { data: {...} }
            const payload =
                typeof res === "string"
                    ? JSON.parse(res)
                    : res?.body && typeof res.body === "string"
                        ? JSON.parse(res.body)
                        : res?.data || res;
            setList({
                items: Array.isArray(payload?.items) ? payload.items : [],
                count:
                    typeof payload?.count === "number"
                        ? payload.count
                        : Array.isArray(payload?.items)
                            ? payload.items.length
                            : 0,
                cursor: payload?.cursor ?? null,
            });
        } catch (e: any) {
            console.error("listReports failed:", e);
            setList({ items: [], count: 0, cursor: null });
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        loadSummary(filters);
        loadList(filters, null);
    }, [JSON.stringify(filters)]);

    const byZone = useMemo(
        () => (summary?.byZone || []).map((d: any) => ({ name: d.farmZone, count: d.count })),
        [summary]
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
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <h2>Pest Pattern Dashboard</h2>

            {/* Filters */}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                    placeholder="farmZone"
                    value={filters.farmZone || ""}
                    onChange={(e) => updateFilter("farmZone", e.target.value)}
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
                        loadList(filters);
                    }}
                >
                    Apply
                </button>
                <button onClick={() => setFilters({})}>Clear</button>
            </div>

            {/* charts */}

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
                        flexDirection: "column"

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
                        flexDirection: "column"
                    }}
                >
                    <h4>By Zone</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byZone}>
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
                        flexDirection: "column"
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

            {/* Table */}
            <div>
                <h4>Reports ({list?.count ?? 0})</h4>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Zone</th>
                                <th>Location</th>
                                <th>Category</th>
                                <th>Severity</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(list?.items ?? []).map((r: any) => (
                                <tr key={r.id}>
                                    <td>{r.dateTime}</td>
                                    <td>{r.farmZone}</td>
                                    <td>{r.location}</td>
                                    <td>{r.problemCategory}</td>
                                    <td>{r.severity}</td>
                                    <td>{r.status}</td>
                                    <td>{r.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!!list?.cursor && (
                    <button
                        onClick={() => loadList(filters, list.cursor)}
                        disabled={loadingList}
                        style={{ marginTop: 8 }}
                    >
                        {loadingList && <div style={{ marginBottom: 8 }}>Loading reports…</div>}
                    </button>
                )}
            </div>

        </div>
    )
}

export default Dashboardv2