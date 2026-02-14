// src/components/FarmReport/AISummaryPanel.tsx
import { useEffect, useState } from "react";
import { getAISummary } from "../../hooks/farmReportAPI";

export default function AISummaryPanel() {
    const [data, setData] = useState<{
        summary: string;
        reportCount: number;
        generatedAt: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    async function fetchSummary() {
        setLoading(true);
        setError(null);
        try {
            const res = await getAISummary();
            setData(res);
        } catch (err: any) {
            setError(err.message || "Failed to generate AI summary");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSummary();
    }, []);

    return (
        <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
                    <span>🤖</span> AI Insights Summary
                </h3>
                <div className="flex items-center gap-2">
                    {data?.generatedAt && (
                        <span className="text-xs text-indigo-400">
                            {new Date(data.generatedAt).toLocaleString()}
                        </span>
                    )}
                    <button
                        onClick={fetchSummary}
                        disabled={loading}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                        {loading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>🔄 Refresh</>
                        )}
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-indigo-500 hover:text-indigo-700 text-sm"
                    >
                        {expanded ? "▲ Collapse" : "▼ Expand"}
                    </button>
                </div>
            </div>

            {expanded && (
                <>
                    {loading && !data && (
                        <div className="flex items-center gap-3 py-8 justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-indigo-600">
                                Analyzing reports...
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">❌ {error}</p>
                        </div>
                    )}

                    {data?.summary && (
                        <div className="prose prose-sm max-w-none text-gray-700">
                            {data.summary.split("\n").map((line, i) => {
                                if (!line.trim()) return <br key={i} />;

                                if (line.startsWith("**") && line.endsWith("**")) {
                                    return (
                                        <h4
                                            key={i}
                                            className="text-indigo-800 font-semibold mt-3 mb-1"
                                        >
                                            {line.replace(/\*\*/g, "")}
                                        </h4>
                                    );
                                }

                                if (line.includes("**")) {
                                    const parts = line.split(/(\*\*.*?\*\*)/g);
                                    return (
                                        <p key={i} className="my-1">
                                            {parts.map((part, j) =>
                                                part.startsWith("**") && part.endsWith("**") ? (
                                                    <strong key={j} className="text-indigo-800">
                                                        {part.replace(/\*\*/g, "")}
                                                    </strong>
                                                ) : (
                                                    <span key={j}>{part}</span>
                                                )
                                            )}
                                        </p>
                                    );
                                }

                                if (line.startsWith("- ") || line.startsWith("• ")) {
                                    return (
                                        <p key={i} className="my-0.5 pl-4">
                                            • {line.replace(/^[-•]\s*/, "")}
                                        </p>
                                    );
                                }

                                return (
                                    <p key={i} className="my-1">
                                        {line}
                                    </p>
                                );
                            })}

                            <p className="text-xs text-indigo-400 mt-4 italic">
                                Based on {data.reportCount} reports · Powered by Amazon
                                Bedrock
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}