// src/components/CreateReportForm.tsx
import { useEffect, useState } from "react";
import { createReport } from "../../hooks/farmReportAPI";

type Props = {
  tentId?: string;
  onChangeTent?: (v: string) => void;
  onCreated?: (item: any) => void;
};

export default function CreateReportForm({ tentId, onChangeTent, onCreated }: Props) {
  const [form, setForm] = useState({
    tentId: tentId ?? "",
    rackId: "",
    severity: 1,
    description: "",
    problemCategory: "pest infestation",
    status: "unresolved",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => ({ ...f, tentId: tentId ?? "" }));
  }, [tentId]);

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "tentId") onChangeTent?.(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        severity: Number(form.severity),
      };
      const res = await createReport(payload);
      onCreated?.(res.item);
      setForm({
        tentId: "",
        rackId: "",
        severity: 1,
        description: "",
        problemCategory: "pest infestation",
        status: "unresolved",
      });
      onChangeTent?.("");
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
        placeholder="Tent Id (e.g., tent-1)"
        value={form.tentId}
        onChange={(e) => update("tentId", e.target.value)}
        required
      />
      <input
        placeholder="Location (e.g., rack-2)"
        value={form.rackId}
        onChange={(e) => update("rackId", e.target.value)}
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