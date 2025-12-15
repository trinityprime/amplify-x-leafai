// src/lat/api/api.ts
const API = "https://stwwel82c4.execute-api.ap-southeast-1.amazonaws.com/initial";

type ParamValue = string | number | undefined | null;

function toQuery(params: Record<string, ParamValue>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string][];
  return new URLSearchParams(entries).toString();
}

export async function listReports(params: Record<string, ParamValue>) {
  const qs = toQuery(params);
  const res = await fetch(`${API}/farmreport?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { count, items, cursor }
}

export async function getSummary(params: Record<string, ParamValue>) {
  const qs = toQuery(params);
  const res = await fetch(`${API}/farmreport/summary?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { total, timeseries, byZone, byCategory }
}

export async function createReport(payload: any) {
  const res = await fetch(`${API}/farmreport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { message, item }
}