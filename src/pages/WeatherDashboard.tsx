// src/pages/WeatherDashboard.tsx
// Weather Dashboard with current weather, historical data, and charts

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  CloudRain,
  CloudSun,
  Sun,
  Droplets,
  Wind,
  Thermometer,
  Eye,
  RefreshCw,
  Calendar,
  Loader2,
  AlertTriangle,
  CloudLightning,
  CloudFog,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  getCurrentWeather,
  getWeatherHistory,
  fetchWeather,
  WeatherData,
  formatHumidity,
  formatRainfall,
  formatWindSpeed,
  formatDateTime,
  timeAgo,
  getHumidityRiskColor,
} from '../hooks/weatherApi';

// Weather condition icon component
const WeatherIcon = ({ conditions, size = 48 }: { conditions: string; size?: number }) => {
  const iconProps = { size, strokeWidth: 1.5 };

  switch (conditions?.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return <Sun {...iconProps} className="text-yellow-500" />;
    case 'clouds':
    case 'cloudy':
      return <Cloud {...iconProps} className="text-slate-400" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain {...iconProps} className="text-blue-500" />;
    case 'thunderstorm':
      return <CloudLightning {...iconProps} className="text-purple-500" />;
    case 'mist':
    case 'fog':
    case 'haze':
      return <CloudFog {...iconProps} className="text-slate-400" />;
    default:
      return <CloudSun {...iconProps} className="text-slate-400" />;
  }
};

export default function WeatherDashboard() {
  useAuthenticator(); // Auth check for role guard

  // State
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Date range for history
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Load weather data on mount
  useEffect(() => {
    loadWeatherData();
  }, []);

  // Load history when date range changes
  useEffect(() => {
    loadWeatherHistory();
  }, [startDate, endDate]);

  const loadWeatherData = async () => {
    setLoading(true);
    setError('');

    try {
      const weather = await getCurrentWeather();
      setCurrentWeather(weather);
      setLastUpdated(weather.fetchedAt);
    } catch (err) {
      console.error('Failed to load current weather:', err);
      // Don't set error for current weather - it might just be no data yet
    }

    try {
      await loadWeatherHistory();
    } catch (err) {
      console.error('Failed to load weather history:', err);
    }

    setLoading(false);
  };

  const loadWeatherHistory = async () => {
    try {
      const history = await getWeatherHistory({
        startDate,
        endDate,
        limit: 100,
      });
      setWeatherHistory(history);
    } catch (err) {
      console.error('Failed to load weather history:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');

    try {
      const weather = await fetchWeather();
      setCurrentWeather(weather);
      setLastUpdated(weather.fetchedAt);
      // Reload history to include new data
      await loadWeatherHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setRefreshing(false);
    }
  };

  // Prepare chart data (reverse for chronological order)
  const chartData = [...weatherHistory]
    .reverse()
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' }),
      time: new Date(w.date).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }),
      temperature: w.temperature,
      humidity: w.humidity,
      rainfall: w.rainfall,
    }));

  // Calculate averages
  const avgTemp = weatherHistory.length > 0
    ? (weatherHistory.reduce((sum, w) => sum + w.temperature, 0) / weatherHistory.length).toFixed(1)
    : '-';
  const avgHumidity = weatherHistory.length > 0
    ? Math.round(weatherHistory.reduce((sum, w) => sum + w.humidity, 0) / weatherHistory.length)
    : '-';
  const totalRainfall = weatherHistory.length > 0
    ? weatherHistory.reduce((sum, w) => sum + w.rainfall, 0).toFixed(1)
    : '-';

  // Pest risk based on humidity
  const pestRiskLevel = currentWeather
    ? currentWeather.humidity >= 80
      ? 'High'
      : currentWeather.humidity >= 70
        ? 'Moderate'
        : 'Low'
    : 'Unknown';
  const pestRiskColor = currentWeather
    ? getHumidityRiskColor(currentWeather.humidity)
    : 'gray';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100/50">
            <Cloud size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Weather <span className="text-blue-600">Dashboard</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Monitor weather conditions and track pest risk factors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/weather/correlations"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Activity size={16} />
            Correlation Analysis
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Current Weather Card */}
          {currentWeather ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Weather Display */}
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-3xl shadow-xl text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-200 font-medium text-sm uppercase tracking-wider">
                      Current Conditions
                    </p>
                    <h2 className="text-4xl font-black mt-2">
                      {currentWeather.location}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">
                      Last updated: {lastUpdated ? timeAgo(lastUpdated) : 'Unknown'}
                    </p>
                  </div>
                  <WeatherIcon conditions={currentWeather.conditions} size={80} />
                </div>

                <div className="mt-8 flex items-end gap-4">
                  <span className="text-7xl font-black">
                    {currentWeather.temperature.toFixed(1)}
                  </span>
                  <span className="text-3xl font-bold text-blue-200 mb-2">°C</span>
                  <span className="text-xl font-medium text-blue-200 ml-4 mb-3 capitalize">
                    {currentWeather.description || currentWeather.conditions}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-blue-400/30">
                  <div>
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                      <Droplets size={14} />
                      Humidity
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatHumidity(currentWeather.humidity)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                      <CloudRain size={14} />
                      Rainfall
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatRainfall(currentWeather.rainfall)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                      <Wind size={14} />
                      Wind
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatWindSpeed(currentWeather.windSpeed)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                      <Eye size={14} />
                      Visibility
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {currentWeather.visibility ? `${currentWeather.visibility}km` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pest Risk Indicator */}
              <div className="space-y-6">
                <div className={`p-6 rounded-3xl border shadow-sm ${
                  pestRiskColor === 'red'
                    ? 'bg-red-50 border-red-200'
                    : pestRiskColor === 'orange'
                      ? 'bg-orange-50 border-orange-200'
                      : pestRiskColor === 'yellow'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className={
                      pestRiskColor === 'red'
                        ? 'text-red-600'
                        : pestRiskColor === 'orange'
                          ? 'text-orange-600'
                          : pestRiskColor === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                    } />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Pest Risk Level
                      </p>
                      <p className={`text-2xl font-black ${
                        pestRiskColor === 'red'
                          ? 'text-red-700'
                          : pestRiskColor === 'orange'
                            ? 'text-orange-700'
                            : pestRiskColor === 'yellow'
                              ? 'text-yellow-700'
                              : 'text-green-700'
                      }`}>
                        {pestRiskLevel}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-4">
                    {pestRiskLevel === 'High'
                      ? 'High humidity favors pest activity. Consider preventive measures.'
                      : pestRiskLevel === 'Moderate'
                        ? 'Moderate conditions. Monitor your plants closely.'
                        : 'Conditions are favorable. Low pest risk expected.'}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Period Summary ({weatherHistory.length} readings)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <Thermometer size={14} /> Avg Temperature
                      </span>
                      <span className="font-bold text-slate-900">{avgTemp}°C</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <Droplets size={14} /> Avg Humidity
                      </span>
                      <span className="font-bold text-slate-900">{avgHumidity}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <CloudRain size={14} /> Total Rainfall
                      </span>
                      <span className="font-bold text-slate-900">{totalRainfall}mm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center">
              <Cloud size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-600">No Weather Data Yet</h3>
              <p className="text-sm text-slate-500 mt-2">
                Click "Refresh Data" to fetch current weather conditions.
              </p>
            </div>
          )}

          {/* Historical Charts Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Historical Weather Data</h2>
              </div>

              {/* Date Range Picker */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-8">
                {/* Temperature & Humidity Chart */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-4">Temperature & Humidity</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                        />
                        <YAxis
                          yAxisId="temp"
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          label={{ value: '°C', position: 'insideLeft', angle: -90 }}
                        />
                        <YAxis
                          yAxisId="humidity"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          label={{ value: '%', position: 'insideRight', angle: 90 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                          name="Temperature (°C)"
                        />
                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                          name="Humidity (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rainfall Chart */}
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-4">Rainfall</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          label={{ value: 'mm', position: 'insideLeft', angle: -90 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rainfall"
                          stroke="#06b6d4"
                          fill="#cffafe"
                          strokeWidth={2}
                          name="Rainfall (mm)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-600">No Historical Data</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Weather data will appear here as it is collected over time.
                </p>
              </div>
            )}
          </div>

          {/* Weather History Table */}
          {weatherHistory.length > 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Weather Records</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-bold text-slate-600">Date/Time</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600">Conditions</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-600">Temp</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-600">Humidity</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-600">Rain</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-600">Wind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weatherHistory.slice(0, 10).map((w) => (
                      <tr key={w.weatherId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">
                          {formatDateTime(w.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <WeatherIcon conditions={w.conditions} size={20} />
                            <span className="capitalize">{w.conditions}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{w.temperature}°C</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          w.humidity >= 70 ? 'text-orange-600' : 'text-slate-900'
                        }`}>
                          {w.humidity}%
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600">
                          {w.rainfall > 0 ? `${w.rainfall}mm` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{w.windSpeed} km/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
