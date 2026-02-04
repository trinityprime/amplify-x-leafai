// src/lat/api/api.ts
const API = "https://stwwel82c4.execute-api.ap-southeast-1.amazonaws.com/initial";

type ParamValue = string | number | undefined | null;

function toQuery(params: Record<string, ParamValue>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string][];
  return new URLSearchParams(entries).toString();
}

export async function listReports(params: Record<string, string | number | undefined | null>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();

  const res = await fetch(`${API}/farmreport?${qs}`);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  // Some Lambdas double-encode JSON in "body"
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && typeof parsed.body === "string") {
      return JSON.parse(parsed.body);
    }
    return parsed;
  } catch {
    // If it's already JSON from APIG proxy integration
    return text as any;
  }
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

export async function updateReport(payload: {
  id: string;
  updates: Record<string, string | number | null>;
}) {
  const res = await fetch(`${API}/farmreport`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && typeof parsed.body === "string") {
      return JSON.parse(parsed.body);
    }
    return parsed;
  } catch {
    return text as any;
  }
}