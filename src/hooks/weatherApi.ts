// src/hooks/weatherApi.ts
// API client for Weather Integration Feature

// Weather API Gateway URL
const WEATHER_API_BASE_URL = 'https://1yk20jzlci.execute-api.ap-southeast-1.amazonaws.com/prod';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WeatherData {
  weatherId: string;
  location: string;
  date: string;              // ISO timestamp
  temperature: number;       // Celsius
  humidity: number;          // percentage (0-100)
  rainfall: number;          // mm
  windSpeed: number;         // km/h
  conditions: string;        // "Clear", "Rain", "Cloudy", "Thunderstorm", etc.
  description: string;       // Detailed description
  pressure: number;          // hPa
  visibility: number | null; // km
  cloudCover: number;        // percentage (0-100)
  fetchedAt: string;         // ISO timestamp
}

export interface CorrelationResult {
  condition: string;         // "High Humidity (>70%)"
  threshold: string;         // ">70%"
  weatherDays: number;       // Number of days matching this condition
  badLeafCount: number;
  goodLeafCount: number;
  totalDetections: number;
  correlationRate: number;   // percentage (0-100)
  sampleSize: number | string;
}

export interface CorrelationInsight {
  type: 'warning' | 'insight' | 'info';
  message: string;
}

export interface CorrelationAnalysis {
  correlationId: string;
  dateRange: string;         // "2026-01-01 to 2026-01-31"
  weatherDataPoints: number;
  totalDetections: number;
  correlations: CorrelationResult[];
  insights: CorrelationInsight[];
  userEmail: string;
  createdAt: string;
  name?: string;             // Custom name/label for the analysis
  notes?: string;            // User notes/comments
}

export interface WeatherHistoryFilters {
  startDate?: string;        // ISO date (YYYY-MM-DD)
  endDate?: string;          // ISO date (YYYY-MM-DD)
  location?: string;
  limit?: number;
}

export interface CorrelationFilters {
  startDate?: string;
  endDate?: string;
  userEmail?: string;
}

// ============================================
// WEATHER DATA FUNCTIONS
// ============================================

/**
 * Manually trigger weather data fetch
 * POST /weather/fetch
 */
export const fetchWeather = async (location?: string): Promise<WeatherData> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ location }),
  });

  const text = await response.text();
  console.log('Fetch weather raw response:', text);

  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.statusText} - ${text}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  // Handle double-encoded JSON
  if (result && typeof result.body === 'string') {
    const parsed = JSON.parse(result.body);
    return parsed.data;
  }

  return result.data;
};

/**
 * Get current/latest weather for location
 * GET /weather/current
 */
export const getCurrentWeather = async (location?: string): Promise<WeatherData> => {
  const params = new URLSearchParams();
  if (location) params.append('location', location);

  const url = `${WEATHER_API_BASE_URL}/weather/current${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get current weather: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data;
  }

  return result.data;
};

/**
 * Get historical weather data
 * GET /weather/history
 */
export const getWeatherHistory = async (
  filters: WeatherHistoryFilters = {}
): Promise<WeatherData[]> => {
  const params = new URLSearchParams();

  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.location) params.append('location', filters.location);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const url = `${WEATHER_API_BASE_URL}/weather/history${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get weather history: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data || [];
  }

  return result.data || [];
};

/**
 * Delete weather data for a specific date
 * DELETE /weather/history/{date}
 */
export const deleteWeatherData = async (date: string): Promise<void> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/history/${date}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete weather data: ${response.statusText}`);
  }
};

// ============================================
// CORRELATION ANALYSIS FUNCTIONS
// ============================================

/**
 * Generate correlation analysis
 * POST /weather/correlations
 */
export const analyzeCorrelations = async (
  filters: CorrelationFilters
): Promise<CorrelationAnalysis> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/correlations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  const text = await response.text();
  console.log('Analyze correlations raw response:', text);

  if (!response.ok) {
    throw new Error(`Failed to analyze correlations: ${response.statusText} - ${text}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data;
  }

  return result.data;
};

/**
 * Get stored correlation analyses
 * GET /weather/correlations
 */
export const getCorrelations = async (
  userEmail?: string,
  limit: number = 10
): Promise<CorrelationAnalysis[]> => {
  const params = new URLSearchParams();
  if (userEmail) params.append('userEmail', userEmail);
  params.append('limit', limit.toString());

  const url = `${WEATHER_API_BASE_URL}/weather/correlations?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get correlations: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data || [];
  }

  return result.data || [];
};

/**
 * Delete a correlation analysis
 * DELETE /weather/correlations/{correlationId}
 */
export const deleteCorrelation = async (correlationId: string): Promise<void> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/correlations/${correlationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete correlation: ${response.statusText}`);
  }
};

/**
 * Update a correlation analysis (name and notes)
 * PUT /weather/correlations/{correlationId}
 */
export const updateCorrelation = async (
  correlationId: string,
  updates: { name?: string; notes?: string }
): Promise<CorrelationAnalysis> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/correlations/${correlationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update correlation: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data;
  }

  return result.data;
};

/**
 * Re-run correlation analysis and update existing record
 * POST /weather/correlations/{correlationId}/rerun
 */
export const rerunCorrelationAnalysis = async (
  correlationId: string,
  filters: CorrelationFilters
): Promise<CorrelationAnalysis> => {
  const response = await fetch(`${WEATHER_API_BASE_URL}/weather/correlations/${correlationId}/rerun`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  const text = await response.text();
  console.log('Rerun correlation raw response:', text);

  if (!response.ok) {
    throw new Error(`Failed to re-run correlation: ${response.statusText} - ${text}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (result && typeof result.body === 'string') {
    return JSON.parse(result.body).data;
  }

  return result.data;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format temperature for display
 */
export const formatTemperature = (temp: number): string => {
  return `${temp.toFixed(1)}C`;
};

/**
 * Format humidity for display
 */
export const formatHumidity = (humidity: number): string => {
  return `${humidity}%`;
};

/**
 * Format rainfall for display
 */
export const formatRainfall = (rainfall: number): string => {
  if (rainfall === 0) return 'None';
  return `${rainfall.toFixed(1)}mm`;
};

/**
 * Format wind speed for display
 */
export const formatWindSpeed = (speed: number): string => {
  return `${speed.toFixed(1)} km/h`;
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
 * Get weather condition icon/emoji
 */
export const getWeatherIcon = (conditions: string): string => {
  const iconMap: Record<string, string> = {
    'Clear': 'sun',
    'Sunny': 'sun',
    'Clouds': 'cloud',
    'Cloudy': 'cloud',
    'Rain': 'cloud-rain',
    'Drizzle': 'cloud-drizzle',
    'Thunderstorm': 'cloud-lightning',
    'Snow': 'cloud-snow',
    'Mist': 'cloud-fog',
    'Fog': 'cloud-fog',
    'Haze': 'cloud-fog',
  };
  return iconMap[conditions] || 'cloud';
};

/**
 * Get color based on correlation rate
 */
export const getCorrelationColor = (rate: number): string => {
  if (rate >= 70) return 'red';
  if (rate >= 50) return 'orange';
  if (rate >= 30) return 'yellow';
  return 'green';
};

/**
 * Get color based on humidity level (for pest risk)
 */
export const getHumidityRiskColor = (humidity: number): string => {
  if (humidity >= 80) return 'red';
  if (humidity >= 70) return 'orange';
  if (humidity >= 60) return 'yellow';
  return 'green';
};

/**
 * Calculate time ago string
 */
export const timeAgo = (isoString: string): string => {
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(isoString);
};

/**
 * Get default date range (last 30 days)
 */
export const getDefaultDateRange = (): { startDate: string; endDate: string } => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};
