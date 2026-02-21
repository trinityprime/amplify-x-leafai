// src/pages/CorrelationAnalysis.tsx
// Pest-Weather Correlation Analysis Page

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';
import { listAllDetections, LeafDetection } from '../hooks/leafDetectionApi';
import {
  Activity,
  Calendar,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Droplets,
  Thermometer,
  CloudRain,
  Info,
  RefreshCw,
  BarChart3,
  Cloud,
  Lightbulb,
  Trash2,
  Pencil,
  X,
  Save,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  analyzeCorrelations,
  getCorrelations,
  deleteCorrelation,
  updateCorrelation,
  rerunCorrelationAnalysis,
  fetchWeather,
  CorrelationAnalysis as CorrelationAnalysisType,
  getDefaultDateRange,
  formatDate,
} from '../hooks/weatherApi';

// Color mapping for correlation rates
const getBarColor = (rate: number): string => {
  if (rate >= 70) return '#ef4444'; // red
  if (rate >= 50) return '#f97316'; // orange
  if (rate >= 30) return '#eab308'; // yellow
  return '#22c55e'; // green
};

// Export correlation analysis as CSV
const exportToCSV = (analysis: CorrelationAnalysisType) => {
  const rows = [
    ['LeafAI Correlation Analysis Report'],
    ['Date Range', analysis.dateRange],
    ['Generated On', new Date(analysis.createdAt).toLocaleString('en-SG')],
    ['Weather Data Points', analysis.weatherDataPoints.toString()],
    ['Total Detections', analysis.totalDetections.toString()],
    analysis.name ? ['Analysis Name', analysis.name] : [],
    analysis.notes ? ['Notes', analysis.notes] : [],
    [],
    ['Condition', 'Weather Days', 'Bad Leaves', 'Good Leaves', 'Total Detections', 'Disease Rate (%)'],
    ...analysis.correlations.map((c) => [
      c.condition,
      c.weatherDays.toString(),
      c.badLeafCount.toString(),
      c.goodLeafCount.toString(),
      c.totalDetections.toString(),
      c.correlationRate.toString(),
    ]),
    [],
    ['Key Insights'],
    ...analysis.insights.map((i) => [i.type.toUpperCase(), i.message]),
  ].filter((row) => row.length > 0);

  const csvContent = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leafai-correlation-${analysis.dateRange.replace(/ to /g, '_to_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function CorrelationAnalysis() {
  const { user } = useAuthenticator();
  const userEmail = user?.signInDetails?.loginId || '';

  // State
  const [analysis, setAnalysis] = useState<CorrelationAnalysisType | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<CorrelationAnalysisType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');

  // Date range
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // Filters for previous analyses
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterFarmer, setFilterFarmer] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Involved uploads state
  const [involvedUploads, setInvolvedUploads] = useState<LeafDetection[]>([]);
  const [showUploads, setShowUploads] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // Edit modal state
  const [editingAnalysis, setEditingAnalysis] = useState<CorrelationAnalysisType | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LeafDetection | null>(null);

  // Load previous analyses on mount
  useEffect(() => {
    loadPreviousAnalyses();
  }, [userEmail]);

  const loadPreviousAnalyses = async () => {
    setLoadingHistory(true);
    try {
      // Fetch all previous analyses (no limit)
      const analyses = await getCorrelations(userEmail, 1000);
      setPreviousAnalyses(analyses);
    } catch (err) {
      console.error('Failed to load previous analyses:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewUploads = async (a: CorrelationAnalysisType) => {
    setShowUploads(true);
    setLoadingUploads(true);
    try {
      const all = await listAllDetections(userEmail);
      // Parse the date range from the analysis
      const [rangeStart, rangeEnd] = (a.dateRange || '').split(' to ');
      const filtered = all.filter((d) => {
        const detectionDate = d.createdAt?.split('T')[0];
        return detectionDate >= rangeStart && detectionDate <= rangeEnd;
      });
      setInvolvedUploads(filtered);
    } catch (err) {
      console.error('Failed to load involved uploads:', err);
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleDeleteAnalysis = async (correlationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click

    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    setDeletingId(correlationId);
    try {
      await deleteCorrelation(correlationId);
      // Remove from local state
      setPreviousAnalyses((prev) => prev.filter((a) => a.correlationId !== correlationId));
      // Clear current analysis if it was the deleted one
      if (analysis?.correlationId === correlationId) {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to delete analysis:', err);
      alert('Failed to delete analysis. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (a: CorrelationAnalysisType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnalysis(a);
    setEditName(a.name || '');
    setEditNotes(a.notes || '');
    // Parse date range for re-run option
    if (a.dateRange) {
      const [start, end] = a.dateRange.split(' to ');
      setEditStartDate(start);
      setEditEndDate(end);
    }
  };

  const closeEditModal = () => {
    setEditingAnalysis(null);
    setEditName('');
    setEditNotes('');
    setEditStartDate('');
    setEditEndDate('');
  };

  const handleSaveEdit = async () => {
    if (!editingAnalysis) return;

    setSaving(true);
    try {
      const updated = await updateCorrelation(editingAnalysis.correlationId, {
        name: editName || undefined,
        notes: editNotes || undefined,
      });

      // Update local state
      setPreviousAnalyses((prev) =>
        prev.map((a) =>
          a.correlationId === editingAnalysis.correlationId
            ? { ...a, name: editName, notes: editNotes }
            : a
        )
      );

      // Update current analysis if it's the one being edited
      if (analysis?.correlationId === editingAnalysis.correlationId) {
        setAnalysis({ ...analysis, name: editName, notes: editNotes });
      }

      closeEditModal();
    } catch (err) {
      console.error('Failed to update analysis:', err);
      alert('Failed to update analysis. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRerunAnalysis = async () => {
    if (!editingAnalysis) return;

    setSaving(true);
    try {
      // Re-run analysis and UPDATE the existing record (not create new)
      const result = await rerunCorrelationAnalysis(editingAnalysis.correlationId, {
        startDate: editStartDate,
        endDate: editEndDate,
        userEmail,
      });

      // Update current analysis view
      setAnalysis(result);

      // Update the analysis in the previous analyses list
      setPreviousAnalyses((prev) =>
        prev.map((a) =>
          a.correlationId === editingAnalysis.correlationId ? result : a
        )
      );

      closeEditModal();
    } catch (err) {
      console.error('Failed to re-run analysis:', err);
      alert('Failed to re-run analysis. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setShowUploads(false);
    setInvolvedUploads([]);

    try {
      // Auto-fetch today's weather first so correlation has fresh data
      const today = new Date().toISOString().split('T')[0];
      if (endDate === today || startDate === today) {
        try {
          await fetchWeather('Singapore');
        } catch (weatherErr) {
          console.warn('Could not auto-fetch today\'s weather:', weatherErr);
          // Don't block the analysis if weather fetch fails
        }
      }

      const result = await analyzeCorrelations({
        startDate,
        endDate,
        userEmail,
      });
      setAnalysis(result);
      // Refresh previous analyses
      await loadPreviousAnalyses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredUploads = involvedUploads.filter((u) => {
    if (filterFarmer && u.farmerId !== filterFarmer) return false;
    if (filterLocation && u.location !== filterLocation) return false;
    if (filterStatus !== 'all' && u.label !== filterStatus) return false;
    if (filterDate && u.createdAt?.split('T')[0] !== filterDate) return false;
    return true;
  });

  // Prepare chart data
  const chartData = analysis?.correlations
    .filter((c) => c.totalDetections > 0)
    .map((c) => ({
      condition: c.condition.split(' ')[0] + ' ' + c.condition.split(' ')[1],
      fullCondition: c.condition,
      rate: c.correlationRate,
      badLeaves: c.badLeafCount,
      goodLeaves: c.goodLeafCount,
      total: c.totalDetections,
    })) || [];

  // Filter previous analyses
  const filteredAnalyses = previousAnalyses.filter((a) => {
    // Filter by published date
    if (publishedFilter !== 'all') {
      const createdDate = new Date(a.createdAt);
      const now = new Date();

      if (publishedFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (createdDate < today) return false;
      } else if (publishedFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (createdDate < weekAgo) return false;
      } else if (publishedFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (createdDate < monthAgo) return false;
      }
    }

    // Filter by analysis date range (month-year)
    if (dateRangeFilter !== 'all' && a.dateRange) {
      const [rangeStart] = a.dateRange.split(' to ');
      const date = new Date(rangeStart);
      const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
      if (monthYear !== dateRangeFilter) return false;
    }

    return true;
  });

  // Get unique month-year combinations from analyses for the date range filter
  const uniqueMonthYears = [...new Set(previousAnalyses.map((a) => {
    if (!a.dateRange) return null;
    const [rangeStart] = a.dateRange.split(' to ');
    const date = new Date(rangeStart);
    return `${date.getMonth()}-${date.getFullYear()}`;
  }).filter((m) => m !== null))] as string[];

  // Sort by year then month (most recent first)
  const sortedMonthYears = uniqueMonthYears.sort((a, b) => {
    const [monthA, yearA] = a.split('-').map(Number);
    const [monthB, yearB] = b.split('-').map(Number);
    if (yearB !== yearA) return yearB - yearA;
    return monthB - monthA;
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Pie chart data for overall distribution
  const pieData = analysis ? [
    {
      name: 'Bad Leaves',
      value: analysis.correlations.reduce((sum, c) => sum + c.badLeafCount, 0),
      color: '#ef4444',
    },
    {
      name: 'Good Leaves',
      value: analysis.correlations.reduce((sum, c) => sum + c.goodLeafCount, 0),
      color: '#22c55e',
    },
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50">
            <Activity size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Correlation <span className="text-emerald-600">Analysis</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Analyze relationships between weather conditions and pest detections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/weather"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            <Cloud size={16} />
            Weather Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Analysis Form & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Analysis Form */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <Calendar size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Generate Analysis</h2>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Analysis Period
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How Correlation Analysis Works</p>
                <p className="mt-1 text-blue-700">
                  This analysis compares weather conditions with pest detection results to identify
                  which environmental factors correlate with higher disease rates. More data points
                  lead to more accurate predictions.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Fetching Weather & Analyzing...
                </>
              ) : (
                <>
                  <Activity size={20} />
                  Run Correlation Analysis
                </>
              )}
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <BarChart3 size={24} className="mx-auto text-blue-600 mb-2" />
                  <p className="text-3xl font-black text-slate-900">
                    {analysis.weatherDataPoints}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Weather Records</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <TrendingUp size={24} className="mx-auto text-emerald-600 mb-2" />
                  <p className="text-3xl font-black text-slate-900">
                    {analysis.totalDetections}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Total Detections</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <Activity size={24} className="mx-auto text-purple-600 mb-2" />
                  <p className="text-3xl font-black text-slate-900">
                    {analysis.correlations.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Conditions Analyzed</p>
                </div>
              </div>

              {/* View Involved Uploads Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (showUploads) {
                      setShowUploads(false);
                    } else {
                      handleViewUploads(analysis);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  <BarChart3 size={16} />
                  {showUploads ? 'Hide Uploads' : `View Involved Uploads (${analysis.totalDetections})`}
                </button>
              </div>

              {/* Involved Uploads Panel */}
              {showUploads && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Involved Uploads
                      <span className="ml-2 text-sm font-medium text-slate-500">({analysis.dateRange})</span>
                    </h3>
                    <button onClick={() => setShowUploads(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={18} />
                    </button>
                  </div>

                  {loadingUploads ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  ) : involvedUploads.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No uploads found for this date range</p>
                    </div>
                  ) : (
                    <>
                      {/* Filters Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <select
                          value={filterFarmer}
                          onChange={(e) => setFilterFarmer(e.target.value)}
                          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">All Farmers</option>
                          {[...new Set(involvedUploads.map((u) => u.farmerId).filter(Boolean))].map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <select
                          value={filterLocation}
                          onChange={(e) => setFilterLocation(e.target.value)}
                          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">All Locations</option>
                          {[...new Set(involvedUploads.map((u) => u.location).filter(Boolean))].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="all">All Status</option>
                          <option value="bad">Bad Leaf</option>
                          <option value="good">Good Leaf</option>
                        </select>
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Results count */}
                      <p className="text-xs text-slate-400 mb-3">
                        Showing {filteredUploads.length} of {involvedUploads.length} uploads
                      </p>

                      {filteredUploads.length === 0 ? (
                        <div className="text-center py-6">
                          <Activity size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-500">No uploads match the filters</p>
                          <button
                            onClick={() => { setFilterFarmer(''); setFilterLocation(''); setFilterStatus('all'); setFilterDate(''); }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                          >
                            Clear filters
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {filteredUploads.map((upload) => (
                            <div
                              key={upload.id}
                              className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => setSelectedImage(upload)}
                            >
                              {upload.photoUrl ? (
                                <img
                                  src={upload.photoUrl}
                                  alt={upload.content || 'Leaf detection'}
                                  className="w-full h-28 object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '';
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-28 bg-slate-200 flex items-center justify-center">
                                  <Activity size={24} className="text-slate-400" />
                                </div>
                              )}
                              <div className="p-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                    upload.label === 'bad'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {upload.label === 'bad' ? '🍂 Bad Leaf' : '🌿 Good Leaf'}
                                </span>
                                <p className="text-xs text-slate-500 mt-1 truncate">👤 {upload.farmerId || 'Unknown farmer'}</p>
                                <p className="text-xs text-slate-500 truncate">📍 {upload.location || 'No location'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">🗓 {new Date(upload.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Correlation Bar Chart */}
              {chartData.length > 0 && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">
                    Disease Rate by Weather Condition
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          label={{ value: 'Disease Rate (%)', position: 'bottom' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="condition"
                          width={100}
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                          }}
                          formatter={(value, _name, props) => {
                            const payload = props?.payload;
                            if (payload) {
                              return [`${value}% (${payload.badLeaves}/${payload.total} bad leaves)`, 'Disease Rate'];
                            }
                            return [`${value}%`, 'Disease Rate'];
                          }}
                        />
                        <Bar dataKey="rate" name="Disease Rate" radius={[0, 8, 8, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Correlation Details Table */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Detailed Results</h3>
                  <button
                    onClick={() => exportToCSV(analysis)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
                  >
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-bold text-slate-600">Condition</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-600">Days</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-600">Bad</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-600">Good</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-600">Total</th>
                        <th className="text-right py-3 px-4 font-bold text-slate-600">Disease Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.correlations.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {c.condition.includes('Humidity') && <Droplets size={14} className="text-blue-500" />}
                              {c.condition.includes('Rain') && <CloudRain size={14} className="text-cyan-500" />}
                              {c.condition.includes('Weather') && <Thermometer size={14} className="text-orange-500" />}
                              {c.condition.includes('Cloud') && <Cloud size={14} className="text-slate-400" />}
                              <span>{c.condition}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">{c.weatherDays}</td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            {c.badLeafCount}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            {c.goodLeafCount}
                          </td>
                          <td className="py-3 px-4 text-right">{c.totalDetections}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-lg font-bold text-xs ${
                                c.correlationRate >= 70
                                  ? 'bg-red-100 text-red-700'
                                  : c.correlationRate >= 50
                                    ? 'bg-orange-100 text-orange-700'
                                    : c.correlationRate >= 30
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {c.correlationRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Insights & History */}
        <div className="space-y-6">
          {/* Insights Panel */}
          {analysis && analysis.insights.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-yellow-500" />
                <h3 className="text-lg font-bold text-slate-900">Key Insights</h3>
              </div>

              <div className="space-y-3">
                {analysis.insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl ${
                      insight.type === 'warning'
                        ? 'bg-red-50 border border-red-200'
                        : insight.type === 'insight'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {insight.type === 'warning' ? (
                        <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                      ) : insight.type === 'insight' ? (
                        <Lightbulb size={16} className="text-blue-600 mt-0.5" />
                      ) : (
                        <Info size={16} className="text-slate-600 mt-0.5" />
                      )}
                      <p className={`text-sm ${
                        insight.type === 'warning'
                          ? 'text-red-800'
                          : insight.type === 'insight'
                            ? 'text-blue-800'
                            : 'text-slate-700'
                      }`}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detection Distribution (Pie Chart) */}
          {analysis && pieData.some((d) => d.value > 0) && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">
                Detection Distribution
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-xs text-slate-600">Bad Leaves</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-xs text-slate-600">Good Leaves</span>
                </div>
              </div>
            </div>
          )}

          {/* Previous Analyses */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                Previous Analyses
              </h3>
              <button
                onClick={loadPreviousAnalyses}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Published
                </label>
                <select
                  value={publishedFilter}
                  onChange={(e) => setPublishedFilter(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Date Range
                </label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="all">All Months</option>
                  {sortedMonthYears.map((monthYear) => {
                    const [month, year] = monthYear.split('-').map(Number);
                    return (
                      <option key={monthYear} value={monthYear}>
                        {monthNames[month]} {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : filteredAnalyses.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {filteredAnalyses.map((a) => (
                  <div
                    key={a.correlationId}
                    className={`relative w-full text-left p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                      analysis?.correlationId === a.correlationId
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                    onClick={() => { setAnalysis(a); setShowUploads(false); setInvolvedUploads([]); setFilterFarmer(''); setFilterLocation(''); setFilterStatus('all'); setFilterDate(''); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {a.name && (
                          <p className="font-bold text-emerald-700 text-sm truncate">
                            {a.name}
                          </p>
                        )}
                        <p className={`font-bold text-slate-900 text-sm ${a.name ? 'text-xs font-medium text-slate-600' : ''}`}>
                          {a.dateRange}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => openEditModal(a, e)}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Edit analysis"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAnalysis(a.correlationId, e)}
                          disabled={deletingId === a.correlationId}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete analysis"
                        >
                          {deletingId === a.correlationId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                        {a.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        {a.weatherDataPoints} weather
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        {a.totalDetections} detections
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center pt-2">
                  {filteredAnalyses.length} of {previousAnalyses.length} analyses
                </p>
              </div>
            ) : previousAnalyses.length > 0 ? (
              <div className="text-center py-4">
                <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No analyses match filters</p>
                <button
                  onClick={() => {
                    setPublishedFilter('all');
                    setDateRangeFilter('all');
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No previous analyses</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
              Risk Levels
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-slate-600">High Risk (70%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span className="text-slate-600">Moderate (50-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span className="text-slate-600">Mild (30-49%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-slate-600">Low Risk (&lt;30%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Pencil size={20} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Edit Analysis</h3>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Current Date Range Display */}
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Current Date Range</p>
                <p className="font-bold text-slate-900">{editingAnalysis.dateRange}</p>
              </div>

              {/* Name Field */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Analysis Name (Optional)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., January Review, Pre-harvest Check"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              {/* Notes Field */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Notes (Optional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add any notes or observations about this analysis..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 pt-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Re-run with Different Dates
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">From</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">To</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRerunAnalysis}
                  disabled={saving || !editStartDate || !editEndDate}
                  className="w-full mt-3 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Re-run Analysis
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
              <button
                onClick={closeEditModal}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.photoUrl}
              alt={selectedImage.content || 'Leaf detection'}
              className="w-full object-contain max-h-96"
            />
            <div className="p-5 space-y-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                selectedImage.label === 'bad' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {selectedImage.label === 'bad' ? '🍂 Bad Leaf' : '🌿 Good Leaf'}
              </span>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">👤 Farmer</p>
                  <p className="text-sm font-bold text-slate-700">{selectedImage.farmerId || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📍 Location</p>
                  <p className="text-sm font-bold text-slate-700">{selectedImage.location || 'No location'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🗓 Date</p>
                  <p className="text-sm font-bold text-slate-700">{new Date(selectedImage.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🐛 Pest Type</p>
                  <p className="text-sm font-bold text-slate-700">{selectedImage.pestType || 'Unknown'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="mt-2 w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

