// src/pages/ScheduledReportsPage.tsx
// Scheduled Reports CRUD Dashboard

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Plus,
  Mail,
  Trash2,
  Edit3,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  CalendarClock,
  Filter,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleActive,
  ScheduledReport,
  CreateScheduleInput,
  ExportFilters,
  formatDateTime,
  calculateNextRunDate,
} from '../hooks/exportApi';
import { listAllDetections } from '../hooks/leafDetectionApi';

export default function ScheduledReportsPage() {
  const { user } = useAuthenticator();
  const userEmail = user?.signInDetails?.loginId || '';

  // Data state
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [uniqueFarmers, setUniqueFarmers] = useState<string[]>([]);
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);

  // Form state
  const [formFrequency, setFormFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [formEmail, setFormEmail] = useState(userEmail);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formFarmerId, setFormFarmerId] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<'good' | 'bad' | 'all'>('all');

  // Load schedules and detection data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [schedulesData, detectionsData] = await Promise.all([
          listSchedules(userEmail),
          listAllDetections(userEmail),
        ]);

        setSchedules(schedulesData);

        // Extract unique values for dropdowns
        const farmers = [...new Set(detectionsData.map(d => d.farmerId).filter(Boolean))];
        const locations = [...new Set(detectionsData.map(d => d.location).filter(Boolean))] as string[];

        setUniqueFarmers(farmers);
        setUniqueLocations(locations);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userEmail]);

  // Refresh schedules
  const refreshSchedules = async () => {
    try {
      const schedulesData = await listSchedules(userEmail);
      setSchedules(schedulesData);
    } catch (err) {
      console.error('Failed to refresh schedules:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormFrequency('weekly');
    setFormEmail(userEmail);
    setFormStartDate('');
    setFormEndDate('');
    setFormFarmerId('');
    setFormLocation('');
    setFormStatus('all');
    setEditingSchedule(null);
  };

  // Open create form
  const openCreateForm = () => {
    resetForm();
    setShowCreateForm(true);
  };

  // Open edit form
  const openEditForm = (schedule: ScheduledReport) => {
    setEditingSchedule(schedule);
    setFormFrequency(schedule.frequency);
    setFormEmail(schedule.email);
    setFormStartDate(schedule.filters.startDate || '');
    setFormEndDate(schedule.filters.endDate || '');
    setFormFarmerId(schedule.filters.farmerId || '');
    setFormLocation(schedule.filters.location || '');
    setFormStatus(schedule.filters.status || 'all');
    setShowCreateForm(true);
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!formEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setActionLoading('submit');
    setError('');

    try {
      const filters: ExportFilters = {
        startDate: formStartDate || undefined,
        endDate: formEndDate || undefined,
        farmerId: formFarmerId || undefined,
        location: formLocation || undefined,
        status: formStatus,
      };

      if (editingSchedule) {
        // Update existing schedule
        await updateSchedule(editingSchedule.scheduleId, {
          frequency: formFrequency,
          email: formEmail,
          filters,
        });
      } else {
        // Create new schedule
        const input: CreateScheduleInput = {
          frequency: formFrequency,
          email: formEmail,
          filters,
        };
        await createSchedule(input, userEmail);
      }

      await refreshSchedules();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle schedule active status
  const handleToggleActive = async (schedule: ScheduledReport) => {
    setActionLoading(schedule.scheduleId);
    try {
      await toggleScheduleActive(schedule.scheduleId, !schedule.active);
      await refreshSchedules();
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete schedule
  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    setActionLoading(scheduleId);
    try {
      await deleteSchedule(scheduleId);
      await refreshSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Get frequency display text
  const getFrequencyText = (frequency: string) => {
    if (frequency === 'weekly') return 'Every Monday at 9:00 AM';
    if (frequency === 'monthly') return '1st of each month at 9:00 AM';
    return frequency;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-slate-500 font-medium">Loading scheduled reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50">
            <CalendarClock size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Scheduled <span className="text-emerald-600">Reports</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Automate weekly or monthly report generation and email delivery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/export"
            className="flex items-center gap-2 px-4 py-2.5 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Export
          </Link>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Plus size={16} />
            New Schedule
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure automated report delivery settings.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Frequency */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> Frequency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormFrequency('weekly')}
                    className={`p-3 rounded-xl font-bold text-sm transition-all ${
                      formFrequency === 'weekly'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Weekly
                    <p className="text-[10px] font-normal opacity-80 mt-0.5">
                      Every Monday
                    </p>
                  </button>
                  <button
                    onClick={() => setFormFrequency('monthly')}
                    className={`p-3 rounded-xl font-bold text-sm transition-all ${
                      formFrequency === 'monthly'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Monthly
                    <p className="text-[10px] font-normal opacity-80 mt-0.5">
                      1st of month
                    </p>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Filter Section Header */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter size={12} /> Report Filters (Optional)
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">From Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">To Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Farmer & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Farmer</label>
                  <select
                    value={formFarmerId}
                    onChange={(e) => setFormFarmerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">All Farmers</option>
                    {uniqueFarmers.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Location</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">All Locations</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 block">Health Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormStatus('all')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      formStatus === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <BarChart3 size={14} className="inline mr-1" /> All
                  </button>
                  <button
                    onClick={() => setFormStatus('good')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      formStatus === 'good'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={14} className="inline mr-1" /> Healthy
                  </button>
                  <button
                    onClick={() => setFormStatus('bad')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      formStatus === 'bad'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <XCircle size={14} className="inline mr-1" /> Diseased
                  </button>
                </div>
              </div>

              {/* Next Run Preview */}
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-xs font-bold text-emerald-700">Next Report:</p>
                <p className="text-sm text-emerald-900 font-medium">
                  {formatDateTime(calculateNextRunDate(formFrequency))}
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading === 'submit'}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'submit' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingSchedule ? 'Update Schedule' : 'Create Schedule'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 mx-auto mb-4">
            <CalendarClock size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Scheduled Reports</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Create your first automated report schedule to receive weekly or monthly detection summaries via email.
          </p>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Plus size={18} />
            Create First Schedule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">
              Active Schedules ({schedules.filter(s => s.active).length} of {schedules.length})
            </h3>
            <button
              onClick={refreshSchedules}
              className="text-slate-500 hover:text-slate-700 transition-colors p-1"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {schedules.map((schedule) => (
              <div
                key={schedule.scheduleId}
                className={`p-6 transition-colors ${
                  !schedule.active ? 'bg-slate-50/50' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          schedule.frequency === 'weekly'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {schedule.frequency}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          schedule.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {schedule.active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">
                          Delivery
                        </p>
                        <p className="text-slate-700 font-medium flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          {schedule.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">
                          Schedule
                        </p>
                        <p className="text-slate-700 font-medium">
                          {getFrequencyText(schedule.frequency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">
                          Next Run
                        </p>
                        <p className="text-slate-700 font-medium">
                          {formatDateTime(schedule.nextRun)}
                        </p>
                      </div>
                    </div>

                    {/* Filter Tags */}
                    <div className="flex flex-wrap gap-2">
                      {schedule.filters.farmerId && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          Farmer: {schedule.filters.farmerId}
                        </span>
                      )}
                      {schedule.filters.location && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          Location: {schedule.filters.location}
                        </span>
                      )}
                      {schedule.filters.status && schedule.filters.status !== 'all' && (
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            schedule.filters.status === 'good'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          Status: {schedule.filters.status === 'good' ? 'Healthy' : 'Diseased'}
                        </span>
                      )}
                      {!schedule.filters.farmerId &&
                        !schedule.filters.location &&
                        (!schedule.filters.status || schedule.filters.status === 'all') && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs">
                            No filters (all records)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(schedule)}
                      disabled={actionLoading === schedule.scheduleId}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.active
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={schedule.active ? 'Pause schedule' : 'Activate schedule'}
                    >
                      {actionLoading === schedule.scheduleId ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : schedule.active ? (
                        <Power size={18} />
                      ) : (
                        <PowerOff size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(schedule)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit schedule"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.scheduleId)}
                      disabled={actionLoading === schedule.scheduleId}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
