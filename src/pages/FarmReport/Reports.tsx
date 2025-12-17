import { useEffect, useMemo, useState } from "react";
import { getSummary, listReports } from "../../hooks/farmReportAPI";



type Filters = {
  farmZone?: string;
  problemCategory?: string;
  status?: string;
  minSeverity?: number;
  from?: string; // ISO
  to?: string; // ISO
};

export default function Reports() {
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
      const res = await listReports({ ...f, limit: 50, cursor: cursor ?? undefined });
      setList({
        items: Array.isArray(res.items) ? res.items : [],
        count: typeof res.count === "number" ? res.count : 0,
        cursor: res.cursor ?? null,
      });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadSummary(filters);
    loadList(filters, null);
  }, [JSON.stringify(filters)]);

  const byTent = useMemo(
    () => (summary?.byTent || []).map((d: any) => ({ name: d.tentId, count: d.count })),
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
    <div>
      <div>
        <h4>Reports ({list?.count ?? 0})</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tent Id</th>
                <th>Rack Id</th>
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
                  <td>{r.tentId}</td>
                  <td>{r.rackId}</td>
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
            {loadingList ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}