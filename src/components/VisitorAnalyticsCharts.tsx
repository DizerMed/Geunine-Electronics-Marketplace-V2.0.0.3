import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Filter,
  Eye,
  Users,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Smartphone,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { VisitorAnalyticsSummary } from '../types';

interface VisitorAnalyticsChartsProps {
  summary: VisitorAnalyticsSummary | null;
  timeframe: string;
  isDark: boolean;
}

type MetricKey = 'all' | 'visitors' | 'views' | 'searches' | 'cartAdds' | 'orders';

const DEVICE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
const FUNNEL_COLORS = ['#3B82F6', '#6366F1', '#EC4899', '#10B981', '#F59E0B'];

export const VisitorAnalyticsCharts: React.FC<VisitorAnalyticsChartsProps> = ({
  summary,
  timeframe,
  isDark
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('all');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');

  // Prepare Daily Traffic data with fallback
  const timelineData = useMemo(() => {
    if (!summary?.dailyTraffic || summary.dailyTraffic.length === 0) return [];
    
    return summary.dailyTraffic.map(item => {
      // Shorten date format for display e.g. "Aug 28" or "28/08"
      let label = item.date;
      try {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const d = new Date(item.date);
          if (!isNaN(d.getTime())) {
            label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            label = `${parts[2]}/${parts[1]}`;
          }
        }
      } catch {}

      return {
        rawDate: item.date,
        displayDate: label,
        visitors: item.visitors || item.uniqueVisitors || 0,
        views: item.productViews || 0,
        searches: item.searches || 0,
        cartAdds: item.cartAdds || 0,
        orders: item.orders || 0
      };
    });
  }, [summary?.dailyTraffic]);

  // Conversion Funnel Data
  const funnelData = useMemo(() => {
    const totalVisits = summary?.totalVisits || summary?.uniqueVisitors || 0;
    const views = summary?.totalProductViews || 0;
    const searches = summary?.totalSearches || 0;
    const cartAdds = summary?.totalCartAdds || 0;
    const orders = summary?.totalOrdersPlaced || 0;

    const base = Math.max(1, totalVisits);

    return [
      { name: '1. Store Visits', count: totalVisits, rate: 100, color: '#3B82F6', icon: Users },
      { name: '2. Product Views', count: views, rate: Math.min(100, Math.round((views / base) * 100)), color: '#6366F1', icon: Eye },
      { name: '3. Search Queries', count: searches, rate: Math.min(100, Math.round((searches / base) * 100)), color: '#F59E0B', icon: Search },
      { name: '4. Cart & Express Adds', count: cartAdds, rate: Math.min(100, Math.round((cartAdds / base) * 100)), color: '#10B981', icon: ShoppingCart },
      { name: '5. Orders Placed', count: orders, rate: Math.min(100, Math.round((orders / base) * 100)), color: '#EC4899', icon: CheckCircle2 }
    ];
  }, [summary]);

  // Device Breakdown Data
  const deviceData = useMemo(() => {
    if (!summary?.deviceBreakdown || summary.deviceBreakdown.length === 0) return [];
    return summary.deviceBreakdown.map((d, index) => ({
      name: d.device || 'Unknown',
      value: d.count,
      percentage: d.percentage,
      color: DEVICE_COLORS[index % DEVICE_COLORS.length]
    }));
  }, [summary?.deviceBreakdown]);

  // 24-Hour EAT Activity Distribution
  const hourlyData = useMemo(() => {
    if (!summary?.activityHeatmap?.hourlyDistribution) return [];
    return summary.activityHeatmap.hourlyDistribution.map(h => ({
      hour: h.hour,
      label: h.hourLabel,
      count: h.count,
      isPeak: h.hour === summary.activityHeatmap?.busiestHour
    }));
  }, [summary?.activityHeatmap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-xl shadow-lg border text-xs ${
          isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/50' : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200'
        }`}>
          <p className="font-bold mb-1.5 text-blue-500">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Timeline Engagement Chart */}
      <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-900/60' : 'bg-blue-50 text-blue-600'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Traffic & Interaction Activity Timeline
              </h3>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Daily flow of visitors, product catalog views, search queries, and purchase actions ({timeframe === 'all' ? 'All Time' : timeframe}).
            </p>
          </div>

          {/* Metric and Chart Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Toggle Chips */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setActiveMetric('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMetric === 'all'
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('visitors')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMetric === 'visitors'
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                Visitors
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('views')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMetric === 'views'
                    ? (isDark ? 'bg-slate-800 text-indigo-400 shadow-xs' : 'bg-white text-indigo-600 shadow-xs')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                Views
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('searches')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMetric === 'searches'
                    ? (isDark ? 'bg-slate-800 text-amber-400 shadow-xs' : 'bg-white text-amber-600 shadow-xs')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                Searches
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('cartAdds')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMetric === 'cartAdds'
                    ? (isDark ? 'bg-slate-800 text-emerald-400 shadow-xs' : 'bg-white text-emerald-600 shadow-xs')
                    : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                Cart Adds
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  chartType === 'area'
                    ? (isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                    : (isDark ? 'text-slate-400' : 'text-slate-600')
                }`}
                title="Area Chart"
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  chartType === 'bar'
                    ? (isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                    : (isDark ? 'text-slate-400' : 'text-slate-600')
                }`}
                title="Bar Chart"
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  chartType === 'line'
                    ? (isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                    : (isDark ? 'text-slate-400' : 'text-slate-600')
                }`}
                title="Line Chart"
              >
                Line
              </button>
            </div>
          </div>
        </div>

        {timelineData.length === 0 ? (
          <div className={`h-64 flex items-center justify-center text-xs rounded-xl border border-dashed ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            No timeline data recorded in this period yet.
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                  <XAxis dataKey="displayDate" stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {(activeMetric === 'all' || activeMetric === 'visitors') && (
                    <Bar dataKey="visitors" name="Unique Visitors" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'views') && (
                    <Bar dataKey="views" name="Product Views" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'searches') && (
                    <Bar dataKey="searches" name="Searches" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'cartAdds') && (
                    <Bar dataKey="cartAdds" name="Cart Adds" fill="#10B981" radius={[4, 4, 0, 0]} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'orders') && (
                    <Bar dataKey="orders" name="Orders" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                  <XAxis dataKey="displayDate" stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {(activeMetric === 'all' || activeMetric === 'visitors') && (
                    <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'views') && (
                    <Line type="monotone" dataKey="views" name="Product Views" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'searches') && (
                    <Line type="monotone" dataKey="searches" name="Searches" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'cartAdds') && (
                    <Line type="monotone" dataKey="cartAdds" name="Cart Adds" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'orders') && (
                    <Line type="monotone" dataKey="orders" name="Orders" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 3 }} />
                  )}
                </LineChart>
              ) : (
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                  <XAxis dataKey="displayDate" stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {(activeMetric === 'all' || activeMetric === 'visitors') && (
                    <Area type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#3B82F6" fillOpacity={1} fill="url(#colorVisitors)" strokeWidth={2} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'views') && (
                    <Area type="monotone" dataKey="views" name="Product Views" stroke="#6366F1" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'searches') && (
                    <Area type="monotone" dataKey="searches" name="Searches" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSearches)" strokeWidth={2} />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'cartAdds') && (
                    <Area type="monotone" dataKey="cartAdds" name="Cart Adds" stroke="#10B981" fillOpacity={1} fill="url(#colorCart)" strokeWidth={2} />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Funnel & Platform Split (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Conversion Funnel */}
        <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-purple-950/60 text-purple-400 border border-purple-900/60' : 'bg-purple-50 text-purple-600'
                }`}>
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Visitor Conversion Funnel
                </h3>
              </div>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                {summary?.conversionRate || 0}% Overall
              </span>
            </div>

            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Full step-by-step shopper journey progression from initial site entry to final order.
            </p>

            <div className="space-y-3.5">
              {funnelData.map((step, idx) => {
                const IconComp = step.icon;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <IconComp className="w-3.5 h-3.5" style={{ color: step.color }} />
                        {step.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" style={{ color: step.color }}>
                          {step.count.toLocaleString()}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {step.rate}%
                        </span>
                      </div>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(3, step.rate)}%`,
                          backgroundColor: step.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`mt-5 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Cart &rarr; Order Rate: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.cartToOrderRate ?? 0}%</strong></span>
            <span>Completed Orders: <strong className="text-emerald-500">{summary?.totalOrdersPlaced ?? 0}</strong></span>
          </div>
        </div>

        {/* Right: 24-Hour EAT Traffic Hourly Breakdown Chart */}
        <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  24-Hour Traffic Intensity (EAT GMT+3)
                </h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                Peak: {summary?.activityHeatmap?.peakHour || '8 PM'}
              </span>
            </div>

            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Hourly customer activity volume across the day to determine optimal times for promotions.
            </p>

            {hourlyData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                No hourly distribution available.
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke={isDark ? '#94A3B8' : '#64748B'} 
                      fontSize={9} 
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis stroke={isDark ? '#94A3B8' : '#64748B'} fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} actions`, 'Traffic Volume']}
                      contentStyle={{
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: isDark ? '#F1F5F9' : '#0F172A'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[3, 3, 0, 0]}
                    >
                      {hourlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isPeak ? '#F59E0B' : isDark ? '#3B82F6' : '#60A5FA'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Recommended Promo Window:</span>
            <strong className="text-amber-500 font-semibold">{summary?.activityHeatmap?.recommendedPromoWindow || '06:00 PM – 10:00 PM'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
