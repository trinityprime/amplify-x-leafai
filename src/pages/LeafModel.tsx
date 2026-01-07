import { useState, useEffect } from "react";
import {
  Upload,
  Activity,
  History,
  Info,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

export default function PlantUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Initialize history from sessionStorage
  const [history, setHistory] = useState<any[]>(() => {
    const saved = sessionStorage.getItem("plant_history");
    return saved ? JSON.parse(saved) : [];
  });

  // Cleanup preview URL
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // 2. Save to sessionStorage whenever history changes
  useEffect(() => {
    sessionStorage.setItem("plant_history", JSON.stringify(history));
  }, [history]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch(
          "https://yad1981nwk.execute-api.ap-southeast-1.amazonaws.com/prod/classify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          }
        );
        const data = await res.json();
        setResult(data);

        const label = data[0] > data[1] ? "Healthy" : "Unhealthy";
        setHistory((prev) => [
          {
            label,
            date: new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            confidence: data[0] > data[1] ? data[0] : data[1],
          },
          ...prev.slice(0, 4),
        ]);
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Upload & Input Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Activity size={20} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Image Analysis
              </h2>
            </div>

            <div
              className={`relative group/preview border-2 border-dashed rounded-3xl p-4 transition-all flex flex-col items-center justify-center min-h-[350px] ${preview
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 hover:border-emerald-400 bg-slate-50"
                }`}
            >
              {preview ? (
                <div className="relative w-full h-full">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-[400px] object-cover rounded-2xl shadow-xl border border-white"
                  />
                  {/* Minimalist Clear Button */}
                  <button
                    onClick={() => setFile(null)}
                    className="absolute top-3 right-3 p-2 bg-slate-900/40 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover/preview:opacity-100 shadow-lg"
                    title="Clear Image"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">
                      Drop your field photo here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports JPG, PNG (Max 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setResult(null);
                    }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`w-full mt-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${!file
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed" // Style for no image
                  : loading
                    ? "bg-slate-100 text-slate-400 cursor-wait" // Style for loading
                    : "bg-slate-900 text-white hover:bg-emerald-600 shadow-lg active:scale-[0.98]" // Style for ready
                }`}
            >
              {loading ? "Processing Visual Data..." : !file ? "Upload Image to Start" : "Run AI Diagnosis"}
              {!loading && file && <Activity size={18} />}
            </button>
          </div>
        </div>

        {/* RIGHT: Analysis & History */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-right-4 duration-500">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                Diagnosis Report
              </h3>

              {(() => {
                const classNames = ["Healthy", "Unhealthy"];
                const probabilities = Array.isArray(result) ? result : [];
                const topIndex = probabilities.indexOf(
                  Math.max(...probabilities)
                );
                const confidence = probabilities[topIndex];
                const label = classNames[topIndex];
                const isHealthy = label === "Healthy";

                return (
                  <div className="p-6 rounded-2xl flex items-center gap-5 border bg-white shadow-sm border-slate-100">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm bg-white border ${isHealthy
                          ? "border-emerald-100 text-emerald-500"
                          : "border-red-100 text-red-500"
                        }`}
                    >
                      {isHealthy ? <CheckCircle /> : <AlertTriangle />}
                    </div>
                    <div>
                      <p
                        className={`text-3xl font-black tracking-tight ${isHealthy ? "text-emerald-900" : "text-red-900"
                          }`}
                      >
                        {label}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Confidence: {(confidence * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[140px]">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-300 mb-3">
                <Info size={20} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Waiting for input
              </p>
            </div>
          )}

          {/* History Sidebar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-slate-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Session Scans
              </h4>
            </div>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p
                        className={`text-xs font-black ${h.label === "Healthy"
                            ? "text-emerald-600"
                            : "text-red-500"
                          }`}
                      >
                        {h.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{h.date}</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                      {(h.confidence * 100).toFixed(2)}%
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 italic">
                  No previous scans
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
