import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  ShoppingCart, 
  TrendingUp, 
  Filter, 
  Calendar, 
  Smartphone, 
  Monitor, 
  Tablet, 
  RotateCw, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  MessageSquare, 
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  Globe,
  Radio,
  Activity,
  Wifi,
  User,
  ExternalLink,
  Copy,
  Check,
  ListFilter,
  BarChart2,
  SearchX,
  Flame,
  Package
} from 'lucide-react';
import { Product, VisitorLog, VisitorAnalyticsSummary, VisitorInteractionType, formatToGMT3 } from '../types';
import { fetchVisitorSummary, fetchVisitorLogs, triggerVisitorLogsCleanup, exportVisitorLogsToCSV, startVisitorPresenceHeartbeat } from '../lib/visitorTrackingService';
import { VisitorActivityHeatmap } from './VisitorActivityHeatmap';
import { TopViewedProductsBreakdown } from './TopViewedProductsBreakdown';
import { VisitorAnalyticsCharts } from './VisitorAnalyticsCharts';
import { VisitorAnalyticsAIAdvisor } from './VisitorAnalyticsAIAdvisor';
import { SearchQueryHistoryModal } from './SearchQueryHistoryModal';
import { customAlert, customConfirm } from '../utils/dialog';

interface AdminVisitorAnalyticsProps {
  products: Product[];
  categories?: any[];
  theme?: 'light' | 'dark';
  isDark?: boolean;
  onNavigateToClient?: (query: string) => void;
  onNavigateToInventory?: (query: string) => void;
  onNavigateToOffers?: (query: string) => void;
}

export const AdminVisitorAnalytics: React.FC<AdminVisitorAnalyticsProps> = ({
  products = [],
  categories = [],
  theme = 'dark',
  isDark: propIsDark,
  onNavigateToClient,
  onNavigateToInventory,
  onNavigateToOffers,
}) => {
  const isDark = propIsDark !== undefined ? propIsDark : theme === 'dark';


  // Timeframe and Filters State
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | '7days' | '30days' | '60days' | 'all'>('30days');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [selectedInteraction, setSelectedInteraction] = useState<VisitorInteractionType | 'ALL'>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Pagination & Layout State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [topSearchesPage, setTopSearchesPage] = useState<number>(1);
  const [topSearchesPageSize, setTopSearchesPageSize] = useState<number>(6);
  const [searchFilterMode, setSearchFilterMode] = useState<'all' | 'high-demand' | 'missing-stock'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyModalQuery, setHistoryModalQuery] = useState<{ query: string, rank?: number, count?: number } | null>(null);

  // Data State
  const [summary, setSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [showLiveDrawer, setShowLiveDrawer] = useState<boolean>(false);

  // Selected Visitor Journey Modal
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  // Load Analytics Summary
  const loadSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingSummary(true);
    try {
      const data = await fetchVisitorSummary(timeframe, customStartDate || undefined, customEndDate || undefined);
      setSummary(data);
      setTopSearchesPage(1);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('Error fetching visitor summary:', err);
    } finally {
      if (!isSilent) setIsLoadingSummary(false);
    }
  }, [timeframe, customStartDate, customEndDate]);

  // Load Filtered Visitor Logs
  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchVisitorLogs({
        timeframe,
        productId: selectedProductId !== 'ALL' ? selectedProductId : undefined,
        interactionType: selectedInteraction !== 'ALL' ? selectedInteraction : undefined,
        deviceType: selectedDevice !== 'ALL' ? selectedDevice : undefined,
        searchQuery: searchQuery.trim() || undefined,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        limit: 300
      });
      setLogs(data.logs || []);
      setTotalLogsCount(data.total || 0);
    } catch (err: any) {
      console.error('Error fetching visitor logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [timeframe, selectedProductId, selectedInteraction, selectedDevice, searchQuery, customStartDate, customEndDate]);

  // Register Admin presence heartbeat and setup auto-refresh + SSE real-time listener
  useEffect(() => {
    // Register this admin tab
    const stopHeartbeat = startVisitorPresenceHeartbeat({ isAdmin: true });

    // Initial fetch
    loadSummary();

    // Auto-refresh interval (every 8 seconds for true real-time)
    const interval = setInterval(() => {
      if (autoRefreshEnabled && document.visibilityState === 'visible') {
        loadSummary(true);
      }
    }, 8000);

    // Instant SSE Live Event Listener
    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const payload = customEvent?.detail;
      if (!payload) return;

      if (payload.type === 'PRESENCE_PULSE' || (payload.type === 'COLLECTION_UPDATE' && payload.collection === 'visitor_logs')) {
        loadSummary(true);
      }
    };

    window.addEventListener('cloud-live-event', handleLiveEvent);

    return () => {
      stopHeartbeat();
      clearInterval(interval);
      window.removeEventListener('cloud-live-event', handleLiveEvent);
    };
  }, [loadSummary, autoRefreshEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  // Handle Manual Purge of Logs Older Than 60 Days (2-Month Retention Spec)
  const handlePurgeLogs = async () => {
    if (!(await customConfirm('Are you sure you want to purge visitor logs older than 60 days (2 months)? This will free up database space while preserving recent traffic data.', 'Purge Logs'))) {
      return;
    }
    setIsCleaning(true);
    try {
      const result = await triggerVisitorLogsCleanup(60);
      setStatusMessage({
        type: 'success',
        text: `Cleanup successful: ${result.deletedCount} expired logs (older than 2 months) were purged.`
      });
      await Promise.all([loadSummary(), loadLogs()]);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Cleanup failed: ${err.message || 'Error executing retention purge'}`
      });
    } finally {
      setIsCleaning(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    if (logs.length === 0) {
      customAlert('No visitor logs to export with current filters.');
      return;
    }
    exportVisitorLogsToCSV(logs, `genuine_visitor_analytics_${timeframe}_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  // Copy visitor ID helper
  const handleCopyVisitorId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, selectedProductId, selectedInteraction, selectedDevice, searchQuery, customStartDate, customEndDate, pageSize]);

  // Paginated logs slice
  const paginatedLogs = useMemo(() => {
    if (pageSize >= logs.length) return logs;
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize >= logs.length || logs.length === 0) return 1;
    return Math.ceil(logs.length / pageSize);
  }, [logs, pageSize]);

  // Count by interaction in current query
  const interactionCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: logs.length };
    logs.forEach(l => {
      counts[l.interactionType] = (counts[l.interactionType] || 0) + 1;
    });
    return counts;
  }, [logs]);

  // Quick helper to filter by a specific product from the top product table
  const handleQuickFilterProduct = (productId: string) => {
    setSelectedProductId(productId);
    window.scrollTo({ top: 750, behavior: 'smooth' });
  };

  // Quick helper to filter by a specific search keyword from top searches
  const handleQuickFilterSearch = (keyword: string) => {
    setSearchQuery(keyword);
    setSelectedInteraction('SEARCH');
    window.scrollTo({ top: 750, behavior: 'smooth' });
  };

  // Find active product details for banner
  const activeSelectedProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === 'ALL') return null;
    return products.find(p => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  // Selected Visitor Journey events
  const visitorJourneyLogs = useMemo(() => {
    if (!selectedVisitorId) return [];
    return logs
      .filter(l => l.visitorId === selectedVisitorId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selectedVisitorId, logs]);

  // Format interaction badge with dark/light themes
  const renderInteractionBadge = (type: VisitorInteractionType) => {
    switch (type) {
      case 'PRODUCT_VIEW':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' 
              : 'bg-blue-50 text-blue-700 border border-blue-200/80'
          }`}>
            <Eye className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Product View
          </span>
        );
      case 'SEARCH':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' 
              : 'bg-amber-50 text-amber-700 border border-amber-200/80'
          }`}>
            <Search className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Search
          </span>
        );
      case 'ADD_TO_CART':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
          }`}>
            <ShoppingCart className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Add to Cart
          </span>
        );
      case 'REMOVE_FROM_CART':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' 
              : 'bg-rose-50 text-rose-700 border border-rose-200/80'
          }`}>
            Remove Cart
          </span>
        );
      case 'EXPRESS_BUY_OPEN':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60' 
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
          }`}>
            <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Express Buy
          </span>
        );
      case 'CHECKOUT_INITIATED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' 
              : 'bg-purple-50 text-purple-700 border border-purple-200/80'
          }`}>
            Checkout
          </span>
        );
      case 'ORDER_PLACED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-teal-950/60 text-teal-300 border border-teal-800/60' 
              : 'bg-teal-50 text-teal-800 border border-teal-200/80'
          }`}>
            <CheckCircle2 className="w-3 h-3 text-teal-500 dark:text-teal-400" /> Order Placed
          </span>
        );
      case 'CATEGORY_FILTER':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-slate-800 text-slate-300 border border-slate-700' 
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <Layers className="w-3 h-3 text-slate-400" /> Category
          </span>
        );
      case 'BRAND_FILTER':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' 
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
          }`}>
            Brand
          </span>
        );
      case 'WHATSAPP_CLICK':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-green-950/60 text-green-300 border border-green-800/60' 
              : 'bg-green-50 text-green-700 border border-green-200/80'
          }`}>
            <MessageSquare className="w-3 h-3 text-green-500 dark:text-green-400" /> WhatsApp
          </span>
        );
      case 'PAGE_VIEW':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDark 
              ? 'bg-slate-800 text-slate-400 border border-slate-700' 
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            <Globe className="w-3 h-3 text-slate-400" /> Page Visit
          </span>
        );
    }
  };

  // Device icon helper
  const renderDeviceIcon = (device?: string) => {
    if (device === 'Mobile') return <Smartphone className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />;
    if (device === 'Tablet') return <Tablet className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />;
    return <Monitor className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Retention Notice */}
      <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-blue-950/60 border border-blue-800/60 text-blue-400' : 'bg-blue-600/10 border border-blue-200 text-blue-600'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Visitor & Interaction Analytics
                </h1>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track real visitor count, searched keywords, product views, and buyer journeys in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe selector */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-medium ${
              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100/80 border-slate-200/60 text-slate-600'
            }`}>
              <button
                type="button"
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === 'today' 
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('yesterday')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === 'yesterday' 
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('7days')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '7days' 
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('30days')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '30days' 
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => { setTimeframe('60days'); setCustomStartDate(''); setCustomEndDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === '60days' && !customStartDate && !customEndDate
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                60 Days
              </button>
              <button
                type="button"
                onClick={() => { setTimeframe('all'); setCustomStartDate(''); setCustomEndDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === 'all' && !customStartDate && !customEndDate
                    ? (isDark ? 'bg-slate-800 text-blue-400 shadow-xs font-semibold' : 'bg-white text-blue-600 shadow-xs font-semibold')
                    : (isDark ? 'hover:text-white' : 'hover:text-slate-900')
                }`}
              >
                All Time
              </button>
            </div>

            {/* Live Auto-Refresh Status Pill */}
            <button
              type="button"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                autoRefreshEnabled
                  ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')
                  : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200')
              }`}
              title={autoRefreshEnabled ? 'Real-time auto-refresh active (every 8s). Click to pause.' : 'Auto-refresh paused. Click to activate.'}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {autoRefreshEnabled ? 'Live Sync (8s)' : 'Sync Paused'}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => { loadSummary(); loadLogs(); }}
              disabled={isLoadingSummary || isLoadingLogs}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Refresh Analytics Data Now"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingSummary || isLoadingLogs ? 'animate-spin text-blue-500' : ''}`} />
              Refresh
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors shadow-xs ${
                isDark 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Export Current Log Results to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            {/* Purge 60+ Days Button */}
            <button
              type="button"
              onClick={handlePurgeLogs}
              disabled={isCleaning}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                isDark 
                  ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border-rose-900/60' 
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
              title="Purge logs older than 60 days to save space"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isCleaning ? 'Purging...' : 'Purge 60d+ Logs'}
            </button>
          </div>
        </div>

        {/* 2-Month Retention & Sync Banner */}
        <div className={`mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium border ${
              isDark 
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            }`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              2-Month Max Retention Active
            </span>
            <span>Logs persist for 60 days maximum and auto-purge to save database space.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Last updated: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{formatToGMT3(lastRefreshedAt).split(' ')[1]} EAT</strong>
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Total logs: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{summary?.retentionInfo?.totalLogsStored || totalLogsCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          statusMessage.type === 'success' 
            ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-800 border border-emerald-200')
            : (isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' : 'bg-rose-50 text-rose-800 border border-rose-200')
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
          {statusMessage.text}
        </div>
      )}

            {(!isLoadingSummary && (summary?.totalVisits === 0 || !summary)) ? (
              <div className={`my-8 p-8 sm:p-12 text-center rounded-2xl border shadow-sm transition-all ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
              }`}>
                <div className="max-w-xl mx-auto flex flex-col items-center">
                  <div className={`w-16 h-16 mb-5 rounded-2xl flex items-center justify-center shadow-md relative ${
                    isDark ? 'bg-slate-800/90 text-blue-400 border border-slate-700/80' : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    <BarChart2 className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>

                  <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    No Visitor Analytics Data Found
                  </h3>
                  
                  <p className={`text-sm leading-relaxed mb-6 max-w-md ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    No visitor traffic, search queries, or page view logs were recorded for the active date range ({timeframe === 'all' ? 'All Time' : timeframe}).
                  </p>

                  {/* Active Filter Indicators */}
                  {(timeframe !== 'all' || customStartDate || customEndDate || selectedProductId !== 'ALL' || selectedInteraction !== 'ALL' || searchQuery) && (
                    <div className={`mb-6 p-3.5 rounded-xl border text-xs w-full ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="font-bold mb-2 flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                        <Filter className="w-3.5 h-3.5" /> Active Range & Filters Applied:
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
                        {timeframe !== 'all' && <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 font-medium">Timeframe: {timeframe}</span>}
                        {customStartDate && <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-500 font-medium">From: {customStartDate}</span>}
                        {customEndDate && <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-500 font-medium">To: {customEndDate}</span>}
                        {selectedProductId !== 'ALL' && <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-medium">Filtered Product</span>}
                        {selectedInteraction !== 'ALL' && <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 font-medium">Interaction: {selectedInteraction}</span>}
                        {searchQuery && <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 font-medium">Search: "{searchQuery}"</span>}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTimeframe('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setSelectedProductId('ALL');
                        setSelectedInteraction('ALL');
                        setSelectedDevice('ALL');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Reset All Filters & Range
                    </button>
                    {timeframe !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setTimeframe('all')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isDark 
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        Switch to 'All Time'
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { loadSummary(); loadLogs(); }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      Refresh Analytics
                    </button>
                  </div>

                  {/* Explanatory Callout */}
                  <div className={`mt-8 pt-5 border-t text-xs text-left w-full flex items-start gap-3 ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}>
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Automatic Event Tracking:</strong> Visitor statistics update continuously whenever customers browse items, perform search queries, add products to cart, or initiate checkout in the store.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
        <>
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unique Visitors */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Unique Visitors</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-900/60' : 'bg-blue-50 text-blue-600'
            }`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.uniqueVisitors ?? 0}
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>in window</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Today: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.uniqueVisitorsToday ?? 0}</strong></span>
            <span>This Week: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.uniqueVisitorsWeek ?? 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Real-Time Live Visitors & Traffic */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Online Right Now</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLiveDrawer(!showLiveDrawer)}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                isDark 
                  ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
              title="Inspect Live Online Visitors"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              Live List
            </button>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-2">
              {summary?.liveOnlineNow !== undefined ? summary.liveOnlineNow : (summary?.liveVisitors15m ?? 0)}
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {(summary?.liveOnlineNow ?? 0) === 1 ? 'active visitor tab' : 'active visitor tabs'}
            </span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span title="Active within the last 15 minutes">15m Window: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.liveVisitors15m ?? 0}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {summary?.liveCustomersOnline ?? 0} customer{(summary?.liveCustomersOnline ?? 0) === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Card 3: Product Views & Searches */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Products Browsed</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' : 'bg-amber-50 text-amber-600'
            }`}>
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.totalProductViews ?? 0}
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>product views</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Searches: <strong className="text-amber-600 dark:text-amber-400">{summary?.totalSearches ?? 0}</strong></span>
            <span>Cart Adds: <strong className="text-emerald-600 dark:text-emerald-400">{summary?.totalCartAdds ?? 0}</strong></span>
          </div>
        </div>

        {/* Card 4: Conversion & Buyer Needs */}
        <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>View-to-Cart Rate</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-purple-950/60 text-purple-400 border border-purple-900/60' : 'bg-purple-50 text-purple-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {summary?.conversionRate ?? 0}%
            </span>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>conversion rate</span>
          </div>
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Cart &rarr; Order: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.cartToOrderRate ?? 0}%</strong></span>
            <span>Orders: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{summary?.totalOrdersPlaced ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Online Visitors Inspector Drawer / Box */}
      {(showLiveDrawer || (summary?.activeOnlineVisitors && summary.activeOnlineVisitors.length > 0)) && (
        <div className={`rounded-2xl border p-5 shadow-sm transition-all animate-fadeIn ${
          isDark ? 'bg-slate-900/90 border-emerald-900/40' : 'bg-emerald-50/40 border-emerald-200/80'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block" />
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-emerald-400' : 'text-emerald-800'
              }`}>
                <Activity className="w-4 h-4" />
                Live Active Visitors Right Now ({summary?.activeOnlineVisitors?.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'
              }`}>
                Auto-refreshes every 8s
              </span>
            </div>
          </div>

          {(!summary?.activeOnlineVisitors || summary.activeOnlineVisitors.length === 0) ? (
            <div className={`text-center py-6 text-xs rounded-xl border border-dashed ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-emerald-200 text-slate-500'
            }`}>
              No active visitors detected at this exact moment. When shoppers or staff open the store, their live session appears here immediately.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.activeOnlineVisitors.map((visitor, idx) => (
                <div 
                  key={visitor.visitorId || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-800/60' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      visitor.isAdmin 
                        ? (isDark ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' : 'bg-purple-50 text-purple-700 border border-purple-200')
                        : (isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                    }`}>
                      {visitor.isAdmin ? <UserCheck className="w-3 h-3 text-purple-400" /> : <Users className="w-3 h-3 text-emerald-400" />}
                      {visitor.isAdmin ? 'Admin / Staff' : 'Customer'}
                    </span>

                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {visitor.secondsAgo <= 5 ? 'Active now' : `${visitor.secondsAgo}s ago`}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Current Page:</span>
                      <span className={`font-mono text-[11px] font-medium truncate max-w-[170px] ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`} title={visitor.pageUrl}>
                        {visitor.pageUrl === '/' ? 'Storefront Home' : visitor.pageUrl}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Device & Browser:</span>
                      <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {visitor.deviceType} • {visitor.browser}
                      </span>
                    </div>

                    {visitor.userName && (
                      <div className="flex items-center justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>User:</span>
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {visitor.userName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orbi AI Visitor Intelligence & Strategic Recommendations Suite */}
      <VisitorAnalyticsAIAdvisor
        summary={summary}
        timeframe={timeframe}
        isDark={isDark}
      />

      {/* Interactive Visual Charts: Traffic Timeline, Conversion Funnel, & 24h Distribution */}
      <VisitorAnalyticsCharts
        summary={summary}
        timeframe={timeframe}
        isDark={isDark}
      />

      {/* Visitor Activity Heatmap Section (Peak Hours, Peak Days & Server Load Optimization) */}
      <VisitorActivityHeatmap 
        heatmapData={summary?.activityHeatmap}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        isDark={isDark}
      />

      {/* Deep Insights Leaderboards: Top Searched Keywords & Most Viewed Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Top Search Queries Leaderboard */}
        <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between h-[620px] transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}>
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Search Queries</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Buyer Demand &amp; Keyword Intent</p>
                </div>
              </div>

              {/* Filter Tabs matching Top Viewed Products */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilterMode('all');
                    setTopSearchesPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    searchFilterMode === 'all'
                      ? (isDark ? 'bg-amber-500 text-slate-950 shadow-xs font-bold' : 'bg-white text-amber-700 shadow-xs font-bold')
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  All Queries
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilterMode('high-demand');
                    setTopSearchesPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    searchFilterMode === 'high-demand'
                      ? (isDark ? 'bg-amber-500 text-slate-950 shadow-xs font-bold' : 'bg-white text-amber-700 shadow-xs font-bold')
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>High Volume</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilterMode('missing-stock');
                    setTopSearchesPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    searchFilterMode === 'missing-stock'
                      ? (isDark ? 'bg-rose-500 text-white shadow-xs font-bold' : 'bg-white text-rose-700 shadow-xs font-bold')
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span>Unmet Demand</span>
                </button>
              </div>
            </div>

            {summary?.topSearches && summary.topSearches.length > 0 ? (
              (() => {
                // Compute matching products and demand metrics for every search query
                const enrichedSearches = summary.topSearches.map((s, originalIdx) => {
                  const queryLower = (s.query || '').trim().toLowerCase();
                  const matchingProducts = products.filter(p => {
                    const name = (p.name || '').toLowerCase();
                    const cat = (p.category || '').toLowerCase();
                    return name.includes(queryLower) || cat.includes(queryLower) || queryLower.split(' ').some(w => w.length > 2 && (name.includes(w) || cat.includes(w)));
                  });
                  const matchedCount = matchingProducts.length;
                  const totalSearchesAll = summary.totalSearches || summary.topSearches.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const demandSharePct = Math.min(100, Math.max(1, Math.round((s.count / totalSearchesAll) * 100)));
                  const isZeroMatch = matchedCount === 0 || (s.resultsCountAvg !== undefined && s.resultsCountAvg === 0);

                  return {
                    ...s,
                    originalRank: originalIdx + 1,
                    matchedCount,
                    demandSharePct,
                    isZeroMatch,
                  };
                });

                // Apply active filter mode
                const filteredSearches = enrichedSearches.filter(s => {
                  if (searchFilterMode === 'high-demand') return s.count >= 5 || s.originalRank <= 4;
                  if (searchFilterMode === 'missing-stock') return s.isZeroMatch;
                  return true;
                });

                const totalSearchesCount = filteredSearches.length;
                const totalSearchPages = Math.ceil(totalSearchesCount / topSearchesPageSize) || 1;
                const startIdx = (topSearchesPage - 1) * topSearchesPageSize;
                const paginatedSearches = filteredSearches.slice(startIdx, startIdx + topSearchesPageSize);

                if (paginatedSearches.length === 0) {
                  return (
                    <div className={`py-12 text-center text-sm flex-1 flex flex-col items-center justify-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <AlertCircle className="w-8 h-8 opacity-40" />
                      <p>No search queries found matching the "{searchFilterMode}" filter.</p>
                      <button
                        type="button"
                        onClick={() => setSearchFilterMode('all')}
                        className="text-xs text-amber-500 hover:underline font-semibold mt-1"
                      >
                        Show All Queries
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar">
                    {paginatedSearches.map((s, idx) => {
                      const rank = s.originalRank;
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border transition-all group cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-amber-700/50' 
                              : 'bg-slate-50 hover:bg-white border-slate-200/70 hover:border-amber-300 shadow-2xs hover:shadow-xs'
                          }`}
                          onClick={() => setHistoryModalQuery({ query: s.query, rank, count: s.count })}
                          title={`Click to analyze search intelligence for "${s.query}"`}
                        >
                          {/* Row 1: Rank, Query Text, Intent Badges & Search Count */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded-lg border text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                rank === 1
                                  ? (isDark ? 'bg-amber-950/80 border-amber-700 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-800')
                                  : (isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                              }`}>
                                #{rank}
                              </span>
                              <div className="min-w-0 flex items-center gap-2">
                                <span className={`text-sm font-bold truncate ${
                                  isDark ? 'text-slate-100 group-hover:text-amber-400' : 'text-slate-800 group-hover:text-amber-700'
                                }`}>
                                  {s.query}
                                </span>
                                {s.isZeroMatch ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                                    isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/60' : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>Unmet Demand</span>
                                  </span>
                                ) : rank <= 3 ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                                    isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    <Flame className="w-2.5 h-2.5 text-amber-500" />
                                    <span>High Demand</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-xs shrink-0">
                              <span className={`font-semibold px-2.5 py-1 rounded-lg border ${
                                isDark ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white text-slate-900 border-slate-200'
                              }`}>
                                {s.count} {s.count === 1 ? 'search' : 'searches'}
                              </span>
                              <ChevronRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 ${
                                isDark ? 'text-slate-500 group-hover:text-amber-400' : 'text-slate-400 group-hover:text-amber-600'
                              }`} />
                            </div>
                          </div>

                          {/* Row 2: Catalog Supply Status & Relative Demand Intensity Bar */}
                          <div className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                            isDark ? 'border-slate-700/50 text-slate-400' : 'border-slate-200/60 text-slate-500'
                          }`}>
                            <div className="flex items-center gap-2">
                              {s.isZeroMatch ? (
                                <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>0 store catalog results (Missing Stock)</span>
                                </span>
                              ) : (
                                <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span>{s.matchedCount} {s.matchedCount === 1 ? 'store product matches' : 'store products match'}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium opacity-80">
                                {s.demandSharePct}% of searches
                              </span>
                              <div className={`w-14 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                <div 
                                  className={`h-full rounded-full ${s.isZeroMatch ? 'bg-rose-500' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, s.demandSharePct * 2.5)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className={`py-12 text-center text-sm flex-1 flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No search queries recorded in this timeframe yet.
              </div>
            )}
          </div>

          {/* Footer Info & Pagination Control */}
          <div className={`mt-4 pt-3 border-t text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Click query to view details.</span>
              </span>

              {/* Rows per page selector */}
              {summary?.topSearches && summary.topSearches.length > 5 && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rows:</span>
                  <div className={`flex items-center p-0.5 rounded-lg border text-[11px] font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    {[5, 6, 8, 12].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setTopSearchesPageSize(sz);
                          setTopSearchesPage(1);
                        }}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          topSearchesPageSize === sz
                            ? (isDark ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white text-amber-700 shadow-xs font-bold')
                            : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {summary?.topSearches && summary.topSearches.length > 0 && (
              (() => {
                const totalSearchesCount = summary.topSearches.length;
                const totalSearchPages = Math.ceil(totalSearchesCount / topSearchesPageSize) || 1;
                const startIdx = (topSearchesPage - 1) * topSearchesPageSize;
                const endIdx = Math.min(startIdx + topSearchesPageSize, totalSearchesCount);

                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium">
                      {startIdx + 1}-{endIdx} of {totalSearchesCount}
                    </span>

                    {totalSearchPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTopSearchesPage(1)}
                          disabled={topSearchesPage === 1}
                          className={`p-1 rounded transition-colors ${
                            topSearchesPage === 1
                              ? 'opacity-30 cursor-not-allowed'
                              : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-200 text-slate-700')
                          }`}
                          title="First Page"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopSearchesPage(p => Math.max(1, p - 1))}
                          disabled={topSearchesPage === 1}
                          className={`p-1 rounded transition-colors ${
                            topSearchesPage === 1
                              ? 'opacity-30 cursor-not-allowed'
                              : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-200 text-slate-700')
                          }`}
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className={`px-1 text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {topSearchesPage}/{totalSearchPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTopSearchesPage(p => Math.min(totalSearchPages, p + 1))}
                          disabled={topSearchesPage === totalSearchPages}
                          className={`p-1 rounded transition-colors ${
                            topSearchesPage === totalSearchPages
                              ? 'opacity-30 cursor-not-allowed'
                              : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-200 text-slate-700')
                          }`}
                          title="Next Page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopSearchesPage(totalSearchPages)}
                          disabled={topSearchesPage === totalSearchPages}
                          className={`p-1 rounded transition-colors ${
                            topSearchesPage === totalSearchPages
                              ? 'opacity-30 cursor-not-allowed'
                              : (isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-200 text-slate-700')
                          }`}
                          title="Last Page"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Right: Top Viewed Products with Search-Query Correlation & Trending Badges */}
        <TopViewedProductsBreakdown
          products={summary?.topProducts || []}
          onSelectProduct={handleQuickFilterProduct}
          onSelectSearchQuery={(q) => setHistoryModalQuery({ query: q })}
          isDark={isDark}
        />
      </div>

      {/* Device & Category Trend Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Distribution */}
        <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Smartphone className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            Device Distribution
          </h3>
          <div className="space-y-3">
            {(summary?.deviceBreakdown || []).map((dev) => (
              <div key={dev.device} className="space-y-1">
                <div className={`flex justify-between text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-1.5">
                    {renderDeviceIcon(dev.device)}
                    {dev.device}
                  </span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{dev.count} ({dev.percentage}%)</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className={`h-full rounded-full ${
                      dev.device === 'Mobile' ? 'bg-blue-500' : dev.device === 'Desktop' ? 'bg-indigo-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.max(4, dev.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Product Categories Breakdown */}
        <div className={`lg:col-span-2 rounded-2xl border p-5 shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Layers className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            Category Interest Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(summary?.topCategories || []).slice(0, 8).map((cat) => (
              <div key={cat.category} className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{cat.category}</p>
                <p className="text-lg font-bold text-blue-500 dark:text-blue-400 mt-1">{cat.count}</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{cat.percentage}% of views</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILTERS BY PRODUCT VIEWED & INTERACTIONS
          ========================================================================= */}
      <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Filter className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              Filter Visitor Activity Logs
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter by specific product viewed, customer search term, or interaction type.
            </p>
          </div>

          {/* Clear Filters Button */}
          {(selectedProductId !== 'ALL' || selectedInteraction !== 'ALL' || selectedDevice !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedProductId('ALL');
                setSelectedInteraction('ALL');
                setSelectedDevice('ALL');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg self-start sm:self-auto transition-colors ${
                isDark 
                  ? 'bg-blue-950/50 text-blue-400 hover:bg-blue-900/60 border border-blue-900/60' 
                  : 'bg-blue-50 text-blue-600 hover:text-blue-800'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. FILTER BY PRODUCT VIEWED */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Filter by Product Viewed
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">📦 All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.length > 40 ? p.name.substring(0, 40) + '...' : p.name} — TZS {(p.price || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* 2. FILTER BY INTERACTION TYPE */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Filter by Interaction
            </label>
            <select
              value={selectedInteraction}
              onChange={(e) => setSelectedInteraction(e.target.value as any)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">⚡ All Interactions</option>
              <option value="PRODUCT_VIEW">👁️ Product Views</option>
              <option value="SEARCH">🔍 Searches Logged</option>
              <option value="ADD_TO_CART">🛒 Add to Cart</option>
              <option value="EXPRESS_BUY_OPEN">⚡ Express Buy Click</option>
              <option value="CHECKOUT_INITIATED">💳 Checkout Initiated</option>
              <option value="ORDER_PLACED">✅ Orders Placed</option>
              <option value="WHATSAPP_CLICK">💬 WhatsApp Inquiries</option>
              <option value="CATEGORY_FILTER">🗂️ Category Filters</option>
              <option value="PAGE_VIEW">🌐 Page Visits</option>
            </select>
          </div>

          {/* 3. FILTER BY DEVICE */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Device Type
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-200' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="ALL">📱 All Devices</option>
              <option value="Mobile">Mobile Phone</option>
              <option value="Desktop">Desktop / Laptop</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>

          {/* 4. KEYWORD & SEARCH FILTER */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Search Query / Visitor ID
            </label>
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search keyword, visitor ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-8 pr-8 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2.5 top-2.5 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Historical Date Range Row */}
        <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Historical Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <X className="w-3.5 h-3.5" /> Clear Custom Dates
            </button>
          )}
        </div>

        {/* Quick Interaction Filter Pills Row */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
            <span className={`text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <ListFilter className="w-3 h-3" /> Quick Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Interactions', icon: null, count: interactionCounts['ALL'] || logs.length },
              { id: 'PRODUCT_VIEW', label: 'Product Views', icon: Eye, count: interactionCounts['PRODUCT_VIEW'] || 0 },
              { id: 'SEARCH', label: 'Searches', icon: Search, count: interactionCounts['SEARCH'] || 0 },
              { id: 'ADD_TO_CART', label: 'Cart Adds', icon: ShoppingCart, count: interactionCounts['ADD_TO_CART'] || 0 },
              { id: 'EXPRESS_BUY_OPEN', label: 'Express Buy', icon: Sparkles, count: interactionCounts['EXPRESS_BUY_OPEN'] || 0 },
              { id: 'CHECKOUT_INITIATED', label: 'Checkout', icon: TrendingUp, count: interactionCounts['CHECKOUT_INITIATED'] || 0 },
              { id: 'ORDER_PLACED', label: 'Orders', icon: CheckCircle2, count: interactionCounts['ORDER_PLACED'] || 0 },
              { id: 'WHATSAPP_CLICK', label: 'WhatsApp', icon: MessageSquare, count: interactionCounts['WHATSAPP_CLICK'] || 0 },
              { id: 'CATEGORY_FILTER', label: 'Categories', icon: Layers, count: interactionCounts['CATEGORY_FILTER'] || 0 },
              { id: 'PAGE_VIEW', label: 'Pages', icon: Globe, count: interactionCounts['PAGE_VIEW'] || 0 },
            ].map((chip) => {
              const isActive = selectedInteraction === chip.id;
              const IconComponent = chip.icon;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedInteraction(chip.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition-all text-xs cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 scale-[1.02]'
                      : isDark
                        ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {IconComponent && <IconComponent className="w-3 h-3" />}
                  <span>{chip.label}</span>
                  {chip.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700 border border-slate-200'
                    }`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Product Banner Indicator */}
        {activeSelectedProduct && (
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isDark 
              ? 'bg-blue-950/40 border-blue-900/60' 
              : 'bg-blue-50/80 border-blue-200'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {activeSelectedProduct.image && (
                <img 
                  src={activeSelectedProduct.image} 
                  alt={activeSelectedProduct.name} 
                  className={`w-10 h-10 rounded-lg object-contain p-0.5 shrink-0 border ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-200'
                  }`}
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isDark ? 'text-blue-300' : 'text-blue-950'}`}>
                  Filtered by Product: {activeSelectedProduct.name}
                </p>
                <p className={`text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  Category: {activeSelectedProduct.category} • Price: TZS {(activeSelectedProduct.price || 0).toLocaleString()} • Stock: {activeSelectedProduct.stock}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProductId('ALL')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 transition-colors ${
                isDark 
                  ? 'bg-slate-900 text-blue-400 border-blue-900 hover:bg-slate-800' 
                  : 'bg-white text-blue-700 border-blue-200 shadow-2xs hover:bg-blue-50'
              }`}
            >
              Clear Product Filter
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          DETAILED VISITOR LOGS ACTIVITY TABLE WITH INLINE SCROLL & PAGINATION
          ========================================================================= */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Activity className="w-4 h-4 text-blue-500" />
              Real Visitor Interaction Stream
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Showing {paginatedLogs.length} of {logs.length} filtered ({totalLogsCount} total)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Rows per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`text-xs rounded-lg px-2.5 py-1 font-semibold border focus:outline-none transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={300}>All (300 max)</option>
            </select>
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="py-20 text-center">
            <RotateCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading visitor logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center border ${
              isDark ? 'bg-slate-800/80 text-amber-400 border-slate-700' : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <SearchX className="w-7 h-7" />
            </div>
            <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              No Matching Activity Logs Found
            </h4>
            <p className={`text-xs max-w-md mx-auto mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No visitor events matched your active filter selections or search term.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedProductId('ALL');
                setSelectedInteraction('ALL');
                setSelectedDevice('ALL');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                isDark 
                  ? 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-400 border-blue-900/60' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Reset Log Filters
            </button>
          </div>
        ) : (
          <div>
            {/* Scrollable Table Viewport with Sticky Header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[560px] scrollbar-thin border-b dark:border-slate-800 border-slate-100">
              <table className="w-full text-left border-collapse table-auto min-w-[760px]">
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                    isDark 
                      ? 'bg-slate-950/95 text-slate-300 border-slate-800 backdrop-blur-md' 
                      : 'bg-slate-100/95 text-slate-700 border-slate-200 backdrop-blur-md'
                  }`}>
                    <th className="py-3 px-4 w-[170px]">Time (EAT - GMT+3)</th>
                    <th className="py-3 px-4 w-[180px]">Visitor & Session</th>
                    <th className="py-3 px-4 w-[150px]">Interaction</th>
                    <th className="py-3 px-4 min-w-[220px]">Target Details</th>
                    <th className="py-3 px-4 w-[170px]">Device & Browser</th>
                    <th className="py-3 px-4 text-right w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'}`}>
                      {/* Timestamp */}
                      <td className={`py-3 px-4 whitespace-nowrap font-mono text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span className="font-semibold">{formatToGMT3(log.createdAt)}</span>
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded shrink-0 ${
                            isDark ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            EAT
                          </span>
                        </div>
                      </td>

                      {/* Visitor ID & User with Copy Action */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 max-w-[170px]">
                          <span 
                            className={`font-mono text-[11px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`} 
                            title={`Visitor ID: ${log.visitorId}`}
                          >
                            {log.visitorId.slice(0, 14)}...
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyVisitorId(log.visitorId, e)}
                            className={`p-1 rounded transition-colors shrink-0 ${
                              copiedId === log.visitorId
                                ? 'text-emerald-400 bg-emerald-950/60'
                                : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                            title={copiedId === log.visitorId ? 'Copied ID!' : 'Copy Visitor ID'}
                          >
                            {copiedId === log.visitorId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {log.userEmail ? (
                          <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium block truncate max-w-[160px]" title={log.userEmail}>
                            {log.userName || log.userEmail}
                          </span>
                        ) : (
                          <span className={`text-[10px] block truncate max-w-[150px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Anonymous Visitor</span>
                        )}
                      </td>

                      {/* Interaction Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderInteractionBadge(log.interactionType)}
                      </td>

                      {/* Target Details (Product or Search Query) with Strict Truncation */}
                      <td className="py-3 px-4">
                        {log.interactionType === 'SEARCH' ? (
                          <div className="flex items-center gap-2 min-w-0 max-w-[260px]">
                            <span 
                              className={`font-semibold px-2 py-0.5 rounded border truncate text-[11px] ${
                                isDark 
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' 
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                              title={`Searched keyword: "${log.searchQuery}"`}
                            >
                              "{log.searchQuery}"
                            </span>
                            <span className={`text-[10px] shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                              ({log.searchResultsCount || 0} results)
                            </span>
                          </div>
                        ) : log.productName ? (
                          <div className="flex items-center gap-2 min-w-0 max-w-[280px]">
                            {log.productImage && (
                              <img 
                                src={log.productImage} 
                                alt={log.productName} 
                                className={`w-7 h-7 rounded object-contain p-0.5 shrink-0 border ${
                                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`} 
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="min-w-0">
                              <span 
                                className={`font-semibold truncate block text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-900'}`} 
                                title={`Product: ${log.productName} (TZS ${(log.productPrice || 0).toLocaleString()})`}
                              >
                                {log.productName}
                              </span>
                              <span className={`text-[10px] truncate block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {log.productCategory || 'General'} • TZS {(log.productPrice || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : log.categoryFilter ? (
                          <span 
                            className={`truncate block max-w-[220px] ${isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}`}
                            title={`Selected Category: ${log.categoryFilter}`}
                          >
                            Category: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{log.categoryFilter}</strong>
                          </span>
                        ) : (
                          <span 
                            className={`truncate block max-w-[220px] font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`} 
                            title={log.pageUrl || '/'}
                          >
                            {log.pageUrl || '/'}
                          </span>
                        )}
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-1.5 font-medium truncate max-w-[160px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {renderDeviceIcon(log.deviceType)}
                          <span className="truncate">{log.deviceType || 'Desktop'}</span>
                        </div>
                        <span 
                          className={`text-[10px] block truncate max-w-[160px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                          title={`${log.browser || 'Browser'} • ${log.os || 'OS'}`}
                        >
                          {log.browser || 'Browser'} • {log.os || 'OS'}
                        </span>
                      </td>

                      {/* Actions: View Journey */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedVisitorId(log.visitorId)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            isDark 
                              ? 'bg-blue-950/50 hover:bg-blue-900/60 text-blue-400 border border-blue-900/50' 
                              : 'bg-blue-50/80 hover:bg-blue-100 text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          Journey
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-100 bg-slate-50/60 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong>{((currentPage - 1) * pageSize) + 1}</strong> to{' '}
                    <strong>{Math.min(currentPage * pageSize, logs.length)}</strong> of{' '}
                    <strong>{logs.length}</strong> records
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className={`px-3 py-1 font-bold rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

              </>
      )}

      {/* =========================================================================
          VISITOR JOURNEY MODAL / DRAWER
          ========================================================================= */}
      {selectedVisitorId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/50 border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Visitor Journey Timeline
                  </h3>
                  <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ID: {selectedVisitorId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitorId(null)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Chronological Journey Steps */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Step-by-step chronology of this visitor's searches, viewed products, and cart actions:
              </p>

              {visitorJourneyLogs.length === 0 ? (
                <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No detailed steps found for this visitor in the current cached query.
                </div>
              ) : (
                <div className={`relative pl-6 border-l-2 space-y-6 ${isDark ? 'border-blue-900/80' : 'border-blue-200'}`}>
                  {visitorJourneyLogs.map((step, idx) => (
                    <div key={step.id} className="relative group">
                      {/* Timeline node */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center ${
                        isDark ? 'bg-slate-900' : 'bg-white'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>

                      <div className={`p-3 rounded-xl border space-y-1.5 ${
                        isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Step {idx + 1}</span>
                            {renderInteractionBadge(step.interactionType)}
                          </div>
                          <span className={`text-[11px] font-mono flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3 text-blue-500" />
                            {formatToGMT3(step.createdAt)} EAT
                          </span>
                        </div>

                        {step.productName && (
                          <div className="flex items-center gap-2 pt-1">
                            {step.productImage && (
                              <img 
                                src={step.productImage} 
                                alt={step.productName} 
                                className={`w-8 h-8 rounded object-contain p-0.5 border ${
                                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{step.productName}</p>
                              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TZS {(step.productPrice || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        )}

                        {step.searchQuery && (
                          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                            Searched: <strong className="text-amber-500 dark:text-amber-400">"{step.searchQuery}"</strong> ({step.searchResultsCount || 0} results)
                          </p>
                        )}

                        {step.categoryFilter && (
                          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Selected Category: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{step.categoryFilter}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedVisitorId(null)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Close Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Query History Modal */}
      {historyModalQuery && (
        <SearchQueryHistoryModal
          isOpen={!!historyModalQuery}
          onClose={() => setHistoryModalQuery(null)}
          query={historyModalQuery.query}
          rank={historyModalQuery.rank}
          totalSearchCount={historyModalQuery.count}
          logs={logs}
          products={products}
          isDark={isDark}
          onNavigateToClient={onNavigateToClient}
          onNavigateToInventory={onNavigateToInventory}
          onNavigateToOffers={onNavigateToOffers}
          onFilterInteractionLogs={(q) => handleQuickFilterSearch(q)}
          onInspectVisitorJourney={(id) => setSelectedVisitorId(id)}
          onSelectProduct={(id) => handleQuickFilterProduct(id)}
        />
      )}
    </div>
  );
};
