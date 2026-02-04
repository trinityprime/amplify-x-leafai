// src/pages/ExportPage.tsx
// Instant CSV Export Page with Filters

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import {
  createExport,
  downloadCsv,
  ExportFilters,
  ExportResult,
} from '../hooks/exportApi';
import { listAllDetections, LeafDetection } from '../hooks/leafDetectionApi';

export default function ExportPage() {
  const { user } = useAuthenticator();
  const userEmail = user?.signInDetails?.loginId || '';

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'good' | 'bad' | 'all'>('all');

  // UI state
  const [loading, setLoading] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState('');

  // Data for dropdowns
  const [allDetections, setAllDetections] = useState<LeafDetection[]>([]);
  const [uniqueFarmers, setUniqueFarmers] = useState<string[]>([]);
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);

  // Load detections for dropdown options
  useEffect(() => {
    const loadDetections = async () => {
      try {
        const detections = await listAllDetections(userEmail);
        setAllDetections(detections);

        // Extract unique values for dropdowns
        const farmers = [...new Set(detections.map(d => d.farmerId).filter(Boolean))];
        const locations = [...new Set(detections.map(d => d.location).filter(Boolean))] as string[];

        setUniqueFarmers(farmers);
        setUniqueLocations(locations);
      } catch (err) {
        console.error('Failed to load detections for filters:', err);
      }
    };

    loadDetections();
  }, [userEmail]);

  // Calculate preview counts based on current filters
  const getFilteredPreview = () => {
    let filtered = [...allDetections];

    if (startDate) {
      filtered = filtered.filter(d => new Date(d.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => new Date(d.createdAt) <= endDateObj);
    }
    if (farmerId) {
      filtered = filtered.filter(d => d.farmerId === farmerId);
    }
    if (location) {
      filtered = filtered.filter(d => d.location === location);
    }
    if (status !== 'all') {
      filtered = filtered.filter(d => d.label === status);
    }

    const good = filtered.filter(d => d.label === 'good').length;
    const bad = filtered.filter(d => d.label === 'bad').length;

    return {
      total: filtered.length,
      good,
      bad,
      goodPct: filtered.length > 0 ? Math.round((good / filtered.length) * 100) : 0,
      badPct: filtered.length > 0 ? Math.round((bad / filtered.length) * 100) : 0,
    };
  };

  const preview = getFilteredPreview();

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setExportResult(null);

    try {
      const filters: ExportFilters = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        farmerId: farmerId || undefined,
        location: location || undefined,
        status: status,
      };

      const result = await createExport(filters, userEmail);
      setExportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (exportResult?.downloadUrl) {
      const filename = `leafai-export-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(exportResult.downloadUrl, filename);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFarmerId('');
    setLocation('');
    setStatus('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50">
            <FileSpreadsheet size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Export <span className="text-emerald-600">Data</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Generate CSV exports of detection records with custom filters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scheduled-reports"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            <Clock size={16} />
            Scheduled Reports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Filter Form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Filter size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Export Filters</h2>
            <button
              onClick={clearFilters}
              className="ml-auto text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Date Range
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

          {/* Farmer & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User size={12} /> Farmer ID
              </label>
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">All Farmers</option>
                {uniqueFarmers.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={12} /> Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Health Status */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Health Status
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('all')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                  status === 'all'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <BarChart3 size={18} /> All
              </button>
              <button
                onClick={() => setStatus('good')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                  status === 'good'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 size={18} /> Healthy
              </button>
              <button
                onClick={() => setStatus('bad')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                  status === 'bad'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <XCircle size={18} /> Diseased
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={loading || preview.total === 0}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Download size={20} />
                Export {preview.total} Records to CSV
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Preview & Results */}
        <div className="space-y-6">
          {/* Preview Stats */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Export Preview
            </h3>

            <div className="text-center py-4">
              <p className="text-5xl font-black text-slate-900">{preview.total}</p>
              <p className="text-sm text-slate-500 mt-1">Total Records</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                  <TrendingUp size={14} />
                  <span className="text-xs font-bold uppercase">Healthy</span>
                </div>
                <p className="text-2xl font-black text-emerald-700">{preview.good}</p>
                <p className="text-xs text-emerald-600">{preview.goodPct}%</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <TrendingDown size={14} />
                  <span className="text-xs font-bold uppercase">Diseased</span>
                </div>
                <p className="text-2xl font-black text-red-700">{preview.bad}</p>
                <p className="text-xs text-red-600">{preview.badPct}%</p>
              </div>
            </div>
          </div>

          {/* Export Result */}
          {exportResult && (
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900">Export Ready!</h3>
                  <p className="text-xs text-emerald-700">
                    {exportResult.totalRecords} records exported
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Detections:</span>
                  <span className="font-bold">{exportResult.summary.totalDetections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Healthy Leaves:</span>
                  <span className="font-bold text-emerald-600">
                    {exportResult.summary.goodLeaves} ({exportResult.summary.goodPercentage}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diseased Leaves:</span>
                  <span className="font-bold text-red-600">
                    {exportResult.summary.badLeaves} ({exportResult.summary.badPercentage}%)
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download CSV
              </button>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              CSV Format
            </h3>
            <div className="text-xs text-slate-600 font-mono bg-white p-3 rounded-lg border border-slate-100 overflow-x-auto">
              ID, Farmer, Location, Status, Pest Type, Date, Photo URL
            </div>
            <p className="text-xs text-slate-500">
              Export includes summary statistics at the bottom of the file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
