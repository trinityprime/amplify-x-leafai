// src/components/CreateReportForm.tsx
import { useState } from "react";
import { createReport } from "../api/api";

type Props = { onCreated?: (item: any) => void };

export default function CreateReportForm({ onCreated }: Props) {
  const [form, setForm] = useState({
    farmZone: "",
    location: "",
    severity: 1,
    description: "",
    problemCategory: "pest infestation",
    status: "unresolved",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createReport({
        ...form,
        severity: Number(form.severity),
      });
      onCreated?.(res.item);
      setForm({
        farmZone: "",
        location: "",
        severity: 1,
        description: "",
        problemCategory: "pest infestation",
        status: "unresolved",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
      <h3>Create Report</h3>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <input
        placeholder="Farm zone (e.g., farm-1)"
        value={form.farmZone}
        onChange={(e) => update("farmZone", e.target.value)}
        required
      />
      <input
        placeholder="Location (e.g., field-A)"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        required
      />
      <input
        type="number"
        min={0}
        max={5}
        placeholder="Severity 0..5"
        value={form.severity}
        onChange={(e) => update("severity", e.target.value)}
        required
      />
      <input
        placeholder="Problem category"
        value={form.problemCategory}
        onChange={(e) => update("problemCategory", e.target.value)}
        required
      />
      <select value={form.status} onChange={(e) => update("status", e.target.value)}>
        <option value="unresolved">unresolved</option>
        <option value="resolved">resolved</option>
      </select>
      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
      />
      <button disabled={loading}>{loading ? "Saving..." : "Create"}</button>
    </form>
  );
}