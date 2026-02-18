// src/hooks/exportApi.ts
// API client for Export and Scheduled Reports Feature

const EXPORT_API_BASE_URL = 'https://gsxldtjsr6.execute-api.ap-southeast-1.amazonaws.com/prod';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ExportFilters {
  startDate?: string;      // ISO date string (e.g., "2026-01-01")
  endDate?: string;        // ISO date string (e.g., "2026-01-31")
  farmerId?: string;
  location?: string;
  status?: 'good' | 'bad' | 'all';
}

export interface ExportResult {
  exportId: string;
  downloadUrl: string;     // S3 pre-signed URL for CSV download
  totalRecords: number;
  summary: {
    totalDetections: number;
    goodLeaves: number;
    badLeaves: number;
    goodPercentage: number;
    badPercentage: number;
  };
  createdAt: string;
}

export interface ScheduledReport {
  scheduleId: string;
  userId: string;
  frequency: 'weekly' | 'monthly';
  filters: ExportFilters;
  email: string;
  active: boolean;
  nextRun: string;        // ISO timestamp
  lastRun?: string;       // ISO timestamp (if executed before)
  createdAt: string;
}

export interface CreateScheduleInput {
  frequency: 'weekly' | 'monthly';
  filters: ExportFilters;
  email: string;
}

export interface UpdateScheduleInput {
  frequency?: 'weekly' | 'monthly';
  filters?: ExportFilters;
  email?: string;
  active?: boolean;
}

// ============================================
// INSTANT EXPORT FUNCTIONS
// ============================================

/**
 * Generate an instant CSV export with optional filters
 * POST /exports
 */
export const createExport = async (
  filters: ExportFilters,
  userEmail: string
): Promise<ExportResult> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters,
      userEmail,
    }),
  });

  const text = await response.text();
  console.log('Export API raw response:', text);

  if (!response.ok) {
    throw new Error(`Failed to create export: ${response.statusText} - ${text}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  console.log('Export API parsed response:', result);

  // Handle double-encoded JSON (if Lambda wraps response in body)
  if (result && typeof result.body === 'string') {
    const parsed = JSON.parse(result.body);
    console.log('Export API body parsed:', parsed);
    return parsed;
  }

  return result;
};

/**
 * Get export details by ID
 * GET /exports/{id}
 */
export const getExport = async (exportId: string): Promise<ExportResult> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/${exportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get export: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body);
  }

  return result;
};

/**
 * Delete an export file
 * DELETE /exports/{id}
 */
export const deleteExport = async (exportId: string): Promise<void> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/${exportId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete export: ${response.statusText}`);
  }
};

// ============================================
// SCHEDULED REPORTS FUNCTIONS
// ============================================

/**
 * Create a new scheduled report
 * POST /exports/schedules
 */
export const createSchedule = async (
  input: CreateScheduleInput,
  userEmail: string
): Promise<ScheduledReport> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/schedules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      userEmail,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create schedule: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body);
  }

  return result;
};

/**
 * List all scheduled reports for a user
 * GET /exports/schedules
 */
export const listSchedules = async (userEmail: string): Promise<ScheduledReport[]> => {
  const url = `${EXPORT_API_BASE_URL}/exports/schedules?userEmail=${encodeURIComponent(userEmail)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list schedules: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).schedules || [];
  }

  return result.schedules || [];
};

/**
 * Get a specific schedule by ID
 * GET /exports/schedules/{id}
 */
export const getSchedule = async (scheduleId: string): Promise<ScheduledReport> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/schedules/${scheduleId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get schedule: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body);
  }

  return result;
};

/**
 * Update a scheduled report
 * PUT /exports/schedules/{id}
 */
export const updateSchedule = async (
  scheduleId: string,
  updates: UpdateScheduleInput
): Promise<ScheduledReport> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/schedules/${scheduleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update schedule: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body);
  }

  return result;
};

/**
 * Delete a scheduled report
 * DELETE /exports/schedules/{id}
 */
export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  const response = await fetch(`${EXPORT_API_BASE_URL}/exports/schedules/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete schedule: ${response.statusText}`);
  }
};

/**
 * Toggle schedule active status
 * Convenience method that calls updateSchedule
 */
export const toggleScheduleActive = async (
  scheduleId: string,
  active: boolean
): Promise<ScheduledReport> => {
  return updateSchedule(scheduleId, { active });
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build query string from filters
 */
export const buildFilterQueryString = (filters: ExportFilters): string => {
  const params = new URLSearchParams();

  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.farmerId) params.append('farmerId', filters.farmerId);
  if (filters.location) params.append('location', filters.location);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);

  return params.toString();
};

/**
 * Download CSV file from URL
 * Triggers browser download
 */
export const downloadCsv = (url: string, filename: string = 'export.csv'): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format date for display
 */
export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format datetime for display
 */
export const formatDateTime = (isoString: string): string => {
  return new Date(isoString).toLocaleString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get next run date based on frequency
 */
export const calculateNextRunDate = (frequency: 'weekly' | 'monthly'): string => {
  const now = new Date();

  if (frequency === 'weekly') {
    // Next Monday at 9am Singapore time
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    return nextMonday.toISOString();
  } else {
    // 1st of next month at 9am Singapore time
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
    return nextMonth.toISOString();
  }
};
