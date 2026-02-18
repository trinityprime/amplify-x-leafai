import { useEffect, useState } from "react";
import { createReport } from "../../hooks/farmReportAPI";

type Props = {
  tentId?: string;
  onChangeTent?: (v: string) => void;
  onCreated?: (item: any) => void;
};

const PROBLEM_CATEGORIES = [
  { value: "pest infestation", label: "🐛 Pest Infestation", icon: "🐛" },
  { value: "fungal disease", label: "🍄 Fungal Disease", icon: "🍄" },
  { value: "nutrient deficiency", label: "🥬 Nutrient Deficiency", icon: "🥬" },
  { value: "water damage", label: "💧 Water Damage", icon: "💧" },
  { value: "physical damage", label: "🔨 Physical Damage", icon: "🔨" },
  { value: "other", label: "❓ Other", icon: "❓" },
];

const SEVERITY_LEVELS = [
  { value: 1, label: "Minor", color: "bg-green-500", description: "Minimal impact" },
  { value: 2, label: "Low", color: "bg-lime-500", description: "Slight concern" },
  { value: 3, label: "Moderate", color: "bg-yellow-500", description: "Needs attention" },
  { value: 4, label: "High", color: "bg-orange-500", description: "Urgent" },
  { value: 5, label: "Critical", color: "bg-red-500", description: "Immediate action" },
];

export default function CreateReportForm({
  tentId,
  onChangeTent,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    tentId: tentId ?? "",
    rackId: "",
    severity: 3,
    description: "",
    problemCategory: "pest infestation",
    status: "unresolved",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, tentId: tentId ?? "" }));
  }, [tentId]);

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "tentId") onChangeTent?.(v);
    setError(null);
    setSuccess(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!form.tentId.trim()) {
      setError("Please select or enter a Tent ID");
      setLoading(false);
      return;
    }
    if (!form.rackId.trim()) {
      setError("Please enter a Rack/Location ID");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        severity: Number(form.severity),
      };
      const res = await createReport(payload);
      setSuccess(true);
      onCreated?.(res.item);
      setForm({
        tentId: "",
        rackId: "",
        severity: 3,
        description: "",
        problemCategory: "pest infestation",
        status: "unresolved",
      });
      onChangeTent?.("");
    } catch (err: any) {
      setError(err.message || "Failed to create report");
    } finally {
      setLoading(false);
    }
  }

  const selectedSeverity = SEVERITY_LEVELS.find((s) => s.value === form.severity);

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <span>❌</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <span>✅</span>
          <p className="text-sm text-emerald-700">
            Report created successfully!
          </p>
        </div>
      )}

      {/* Tent ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tent ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., tent-1"
          value={form.tentId}
          onChange={(e) => update("tentId", e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                     outline-none transition"
        />
        <p className="text-xs text-gray-400 mt-1">
          Select from map or enter manually
        </p>
      </div>

      {/* Rack/Location ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rack / Location ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., rack-A2"
          value={form.rackId}
          onChange={(e) => update("rackId", e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                     outline-none transition"
        />
      </div>

      {/* Problem Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Problem Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PROBLEM_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => update("problemCategory", cat.value)}
              className={`p-3 rounded-lg border text-left text-sm transition
                ${
                  form.problemCategory === cat.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.label.replace(cat.icon + " ", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Severity Level <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            {SEVERITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => update("severity", level.value)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition
                  ${
                    form.severity === level.value
                      ? `${level.color} text-white border-transparent`
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                {level.value}
              </button>
            ))}
          </div>
          {selectedSeverity && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${selectedSeverity.color}`}
              />
              <span className="font-medium">{selectedSeverity.label}</span>
              <span>— {selectedSeverity.description}</span>
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("status", "unresolved")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2
              ${
                form.status === "unresolved"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
          >
            <span>⚠️</span> Unresolved
          </button>
          <button
            type="button"
            onClick={() => update("status", "resolved")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2
              ${
                form.status === "resolved"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
          >
            <span>✅</span> Resolved
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          placeholder="Describe the issue in detail (optional)..."
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                     outline-none transition resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg text-white font-semibold text-sm transition
          ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
          }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating Report...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>📤</span> Submit Report
          </span>
        )}
      </button>
    </form>
  );
}