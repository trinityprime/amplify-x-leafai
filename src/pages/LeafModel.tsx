import { useState, useEffect } from "react";
import {
  Upload,
  Activity,
  History,
  Info,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCcw,
} from "lucide-react";

export default function PlantUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [history, setHistory] = useState<any[]>(() => {
    const saved = sessionStorage.getItem("plant_history");
    return saved ? JSON.parse(saved) : [];
  });

  const validResults = batchResults.filter((r) => r && Array.isArray(r.data));

  const averageConfidence =
    validResults.length > 0
      ? validResults.reduce((acc, curr) => {
          const conf = Math.max(curr.data[0], curr.data[1]);
          return acc + conf;
        }, 0) / validResults.length
      : 0;

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  useEffect(() => {
    sessionStorage.setItem("plant_history", JSON.stringify(history));
  }, [history]);

  // --- Reset Function ---
  const resetAnalysis = () => {
    setFiles([]);
    setPreviews([]);
    setBatchResults([]);
    setLoading(false);
  };

  const handleFiles = (selectedFiles: File[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
    setPreviews((prev) => [
      ...prev,
      ...selectedFiles.map((f) => URL.createObjectURL(f)),
    ]);
    setBatchResults((prev) => [
      ...prev,
      ...new Array(selectedFiles.length).fill(null),
    ]);
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setBatchResults((prev) => prev.filter((_, i) => i !== index));
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const SIZE = 224;
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, SIZE, SIZE);
          resolve(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]);
        };
      };
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);

    try {
      const base64Images = await Promise.all(files.map((f) => resizeImage(f)));
      const uploadPromises = base64Images.map((base64, index) =>
        fetch(
          "https://yad1981nwk.execute-api.ap-southeast-1.amazonaws.com/prod/classify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 }),
          },
        ).then(async (res) => {
          const data = await res.json();
          if (!res.ok || data.isRejected) {
            return {
              id: index,
              success: false,
              data: { isRejected: true, message: data.message },
            };
          }
          return { id: index, success: true, data };
        }),
      );

      const responses = await Promise.all(uploadPromises);
      setBatchResults(responses);

      const newEntries = responses
        .filter((r) => r.success && !r.data.isRejected)
        .map((r) => {
          const isHealthy = r.data[0] > r.data[1];
          return {
            label: isHealthy ? "Healthy" : "Unhealthy",
            confidence: isHealthy ? r.data[0] : r.data[1],
            date: new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });
      setHistory((prev) => [...newEntries, ...prev].slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Image Analysis */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Activity size={20} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  Image Analysis
                </h2>
              </div>
              {files.length > 0 && (
                <button
                  onClick={resetAnalysis}
                  className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  <RefreshCcw size={12} /> Reset
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(Array.from(e.dataTransfer.files));
              }}
              className={`relative group/preview border-2 border-dashed rounded-3xl p-4 transition-all flex flex-col items-center justify-center min-h-[350px] ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/50"
                  : previews.length > 0
                  ? "border-emerald-200 bg-emerald-50/10"
                  : "border-slate-200 bg-slate-50 hover:border-emerald-400"
              }`}
            >
              {previews.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  {previews.map((url, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square rounded-2xl overflow-hidden shadow-sm border border-white bg-slate-100"
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt="Preview"
                      />

                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 z-20 p-1.5 bg-slate-900/60 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>

                      {batchResults[i] && (
                        /* bg-white/40 reduces the opacity of the white blur */
                        /* backdrop-blur-sm creates the frosted glass effect */
                        <div className="absolute inset-0 z-10 bg-white/70  flex flex-col items-center justify-center p-2 text-center animate-in fade-in">
                          {Array.isArray(batchResults[i].data) ? (
                            <>
                              {batchResults[i].data[0] >
                              batchResults[i].data[1] ? (
                                <CheckCircle
                                  size={24}
                                  className="text-emerald-500"
                                />
                              ) : (
                                <AlertTriangle
                                  size={24}
                                  className="text-red-500"
                                />
                              )}
                              <p className="text-[10px] font-black mt-1 uppercase text-slate-800">
                                {batchResults[i].data[0] >
                                batchResults[i].data[1]
                                  ? "Healthy"
                                  : "Unhealthy"}
                              </p>
                              <p className="text-[11px] font-black text-slate-900 bg-white/50 px-2 py-0.5 rounded-lg mt-1">
                                {(
                                  Math.max(
                                    batchResults[i].data[0],
                                    batchResults[i].data[1],
                                  ) * 100
                                ).toFixed(0)}
                                %
                              </p>
                            </>
                          ) : (
                            <div className="flex flex-col items-center px-2">
                              <AlertTriangle
                                size={20}
                                className="text-amber-600"
                              />
                              <p className="text-[10px] font-black mt-1 uppercase text-amber-700">
                                Not a Crop
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all cursor-pointer">
                    <Upload size={20} />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        handleFiles(Array.from(e.target.files || []))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
                    <Upload size={32} />
                  </div>
                  <p className="font-bold text-slate-700">
                    Drop field photos here
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) =>
                      handleFiles(Array.from(e.target.files || []))
                    }
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className={`w-full mt-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                loading
                  ? "bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-white hover:bg-emerald-600 shadow-lg"
              }`}
            >
              {loading ? "Analysing..." : `Run AI Diagnosis (${files.length})`}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Diagnostic Output & History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
              Diagnostic Output
            </h3>
            {batchResults.some((r) => r !== null) ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-4xl font-black text-slate-800 tracking-tighter">
                      {
                        batchResults.filter(
                          (r) =>
                            Array.isArray(r?.data) && r.data[0] > r.data[1],
                        ).length
                      }{" "}
                      /{" "}
                      {
                        batchResults.filter((r) => Array.isArray(r?.data))
                          .length
                      }
                    </p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      Healthy Leaves
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">
                      {(averageConfidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Avg Confidence
                    </p>
                  </div>
                </div>
                {/* Visual average bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${averageConfidence * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-300 py-4">
                <Info size={20} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  System Standing By
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-slate-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Recent Scans
              </h4>
            </div>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p
                        className={`text-xs font-black ${
                          h.label === "Healthy"
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {h.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{h.date}</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                      {(h.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 italic text-center py-4">
                  No data in current session
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
