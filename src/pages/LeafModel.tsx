import { useState, useEffect } from "react";

export default function PlantUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Handle image preview
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null); // Clear previous results

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
      } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to connect to the SageMaker endpoint.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        Plant Health AI
      </h2>

      {/* Upload Area */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 transition-hover hover:border-green-500">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 rounded-lg mb-4 shadow-sm"
          />
        ) : (
          <div className="py-10 text-gray-400 text-center">
            <p>No image selected</p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
        />
      </div>

      <button
        onClick={handleUpload}
        className={`w-full mt-6 px-4 py-3 rounded-lg font-bold text-white transition-all ${
          loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 shadow-md"
        }`}
        disabled={!file || loading}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 mr-3 text-white"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Analyzing...
          </span>
        ) : (
          "Run Diagnosis"
        )}
      </button>

      {/* Result Display */}
      {result && (
        <div className="mt-6 animate-fade-in">
          {/* Logic to handle the raw array from SageMaker */}
          {(() => {
            // 1. Define labels based on your .lst file (Index 0 = Healthy, 1 = Unhealthy)
            const classNames = ["Healthy", "Unhealthy"];

            // 2. SageMaker returns an array like [0.998, 0.002]
            // We ensure it's an array, then find the highest probability
            const probabilities = Array.isArray(result) ? result : [];
            const topIndex = probabilities.indexOf(Math.max(...probabilities));

            const confidence = probabilities[topIndex];
            const label = classNames[topIndex] || "Detection Failed";
            const isHealthy = label === "Healthy";

            return (
              <>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Diagnosis:
                </h3>
                <div
                  className={`p-5 rounded-lg border-l-8 shadow-sm ${
                    isHealthy
                      ? "bg-green-50 border-green-500 text-green-900"
                      : "bg-red-50 border-red-600 text-red-900"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-black uppercase tracking-tight">
                        {label}
                      </p>
                      <p className="text-sm font-medium opacity-70">
                        Confidence Score: {(confidence * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-4xl">{isHealthy ? "🌿" : "🍂"}</div>
                  </div>
                </div>
              </>
            );
          })()}

          <details className="mt-6">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 underline">
              View raw probability data
            </summary>
            <pre className="mt-2 p-3 bg-gray-800 text-green-400 text-xs rounded-md overflow-x-auto border border-gray-700">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
