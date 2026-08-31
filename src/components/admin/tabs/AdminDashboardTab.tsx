import React, { useState, useMemo, useEffect } from "react";
import { Product, Order, POSTransaction, CategoryItem, VisitorAnalyticsSummary } from "../../../types";
import { VisitorActivityHeatmap } from "../../VisitorActivityHeatmap";
import { TopViewedProductsBreakdown } from "../../TopViewedProductsBreakdown";
import { fetchVisitorSummary } from "../../../lib/visitorTrackingService";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  Percent,
  Calendar,
  Layers,
  ChevronRight,
  Banknote
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export interface AdminDashboardTabProps {
  products: Product[];
  orders: Order[];
  posTransactions: POSTransaction[];
  categories?: CategoryItem[];
  setActiveTab: (tab: any) => void;
  onOpenAddModal?: () => void;
  onOpenEditModal?: (p: Product) => void;
  updateOrderStatus?: (orderId: string, status: Order["status"]) => Promise<void> | void;
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  inputBg?: string;
  tableHeaderBg: string;
  tableRowHover: string;
  formatTZS: (val: number) => string;
  formatToGMT3?: (date: any) => string;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  products = [],
  orders = [],
  posTransactions = [],
  categories = [],
  setActiveTab,
  onOpenAddModal,
  onOpenEditModal,
  updateOrderStatus = () => {},
  isDark,
  cardBg,
  textTitle,
  textSub,
  tableHeaderBg,
  tableRowHover,
  formatTZS,
  formatToGMT3 = (d) => String(d || "")
}) => {
  const [chartTimeframe, setChartTimeframe] = useState<"daily" | "weekly" | "yearly">("daily");
  const [dashboardVisitorSummary, setDashboardVisitorSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<"today" | "7days" | "30days" | "60days">("30days");

  useEffect(() => {
    fetchVisitorSummary(heatmapTimeframe)
      .then((data) => setDashboardVisitorSummary(data))
      .catch((err) => console.warn("Failed to load visitor summary in dashboard tab:", err));
  }, [heatmapTimeframe]);

  const handleOpenEditModal = onOpenEditModal || (() => {});

  const isRecognizedOrder = (o: Order) => o.status !== "Cancelled";

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.price || 0) * Math.max(0, Number(p.stock || 0)), 0);
  }, [products]);

  const recognizedOnlineRevenue = useMemo(() => {
    return orders
      .filter(isRecognizedOrder)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  }, [orders]);

  const recognizedPosRevenue = useMemo(() => {
    return posTransactions
      .reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
  }, [posTransactions]);

  const totalRevenue = recognizedOnlineRevenue + recognizedPosRevenue;
  const lowStockProducts = useMemo(() => products.filter((p) => Number(p.stock || 0) <= 0), [products]);

  // Tanzanian Date Helper
  const getTanzaniaDateParts = (date: any) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Dar_es_Salaam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    return {
      year: Number(map.year),
      month: Number(map.month) - 1,
      day: Number(map.day),
      weekday: map.weekday,
      dateKey: `${map.year}-${map.month}-${map.day}`
    };
  };

  // Sales Trend Data
  const salesTrendData = useMemo(() => {
    const now = new Date();
    const localNow = getTanzaniaDateParts(now);
    const todayKey = localNow?.dateKey;
    const recognizedOrders = orders.filter(isRecognizedOrder);

    const revenueForDayKey = (key: string) => {
      const online = recognizedOrders
        .filter(o => getTanzaniaDateParts(o.createdAt)?.dateKey === key)
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions
        .filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey === key)
        .reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      return { online, pos };
    };

    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(
        localNow?.year ?? now.getUTCFullYear(),
        localNow?.month ?? now.getUTCMonth(),
        (localNow?.day ?? now.getUTCDate()) - i
      ));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const rev = revenueForDayKey(key);
      const txs = recognizedOrders.filter(o => getTanzaniaDateParts(o.createdAt)?.dateKey === key).length +
        posTransactions.filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey === key).length;
      const labelDate = new Date(`${key}T12:00:00Z`);
      days.push({
        label: labelDate.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        subLabel: labelDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        fullLabel: key === todayKey ? "Today" : labelDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }),
        revenue: rev.online + rev.pos,
        onlineRevenue: rev.online,
        posRevenue: rev.pos,
        transactions: txs,
      });
    }

    const currentLocal = new Date(Date.UTC(localNow?.year ?? now.getUTCFullYear(), localNow?.month ?? now.getUTCMonth(), localNow?.day ?? now.getUTCDate(), 12));
    const dayOfWeek = currentLocal.getUTCDay();
    const currentWeekStart = new Date(currentLocal);
    currentWeekStart.setUTCDate(currentLocal.getUTCDate() - dayOfWeek);
    const weeks: any[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(currentWeekStart);
      start.setUTCDate(start.getUTCDate() - w * 7);
      const endExclusive = new Date(start);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);
      const startKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`;
      const endKey = `${endExclusive.getUTCFullYear()}-${String(endExclusive.getUTCMonth() + 1).padStart(2, "0")}-${String(endExclusive.getUTCDate()).padStart(2, "0")}`;

      const inRange = (createdAt: string) => {
        const key = getTanzaniaDateParts(createdAt)?.dateKey;
        return Boolean(key && key >= startKey && key < endKey);
      };
      const online = recognizedOrders.filter(o => inRange(o.createdAt)).reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions.filter(t => inRange(t.createdAt)).reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      const txs = recognizedOrders.filter(o => inRange(o.createdAt)).length + posTransactions.filter(t => inRange(t.createdAt)).length;

      weeks.push({
        label: w === 0 ? "This Week" : `Week ${4 - w}`,
        subLabel: `W${4 - w}`,
        fullLabel: w === 0 ? "This Week Performance" : `Week ${4 - w} Performance`,
        revenue: online + pos,
        onlineRevenue: online,
        posRevenue: pos,
        transactions: txs,
      });
    }

    const years: any[] = [];
    const year = localNow?.year ?? now.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) {
      const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
      const inMonth = (createdAt: string) => getTanzaniaDateParts(createdAt)?.dateKey.startsWith(prefix);
      const online = recognizedOrders.filter(o => inMonth(o.createdAt)).reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions.filter(t => inMonth(t.createdAt)).reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      const txs = recognizedOrders.filter(o => inMonth(o.createdAt)).length + posTransactions.filter(t => inMonth(t.createdAt)).length;
      years.push({ label: months[m], subLabel: `${year}`, fullLabel: `${months[m]} ${year} Performance`, revenue: online + pos, onlineRevenue: online, posRevenue: pos, transactions: txs });
    }

    return { days, weeks, years };
  }, [orders, posTransactions]);

  const { growthLastMonth, salesPerWeek } = useMemo(() => {
    const now = new Date();
    const local = getTanzaniaDateParts(now);
    if (!local) return { growthLastMonth: "0.0", salesPerWeek: 0 };
    const currentMonthPrefix = `${local.year}-${String(local.month + 1).padStart(2, "0")}`;
    const previousDate = new Date(Date.UTC(local.year, local.month - 1, 1, 12));
    const previousYear = previousDate.getUTCFullYear();
    const previousMonth = previousDate.getUTCMonth() + 1;
    const previousMonthPrefix = `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
    const orderRevenueForPrefix = (prefix: string) => orders.filter(o => isRecognizedOrder(o) && getTanzaniaDateParts(o.createdAt)?.dateKey.startsWith(prefix)).reduce((a, b) => a + Number(b.totalAmount || 0), 0);
    const posRevenueForPrefix = (prefix: string) => posTransactions.filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey.startsWith(prefix)).reduce((a, b) => a + Number(b.total ?? (b as any).totalAmount ?? 0), 0);
    const thisMonthRev = orderRevenueForPrefix(currentMonthPrefix) + posRevenueForPrefix(currentMonthPrefix);
    const lastMonthRev = orderRevenueForPrefix(previousMonthPrefix) + posRevenueForPrefix(previousMonthPrefix);
    const growth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : thisMonthRev > 0 ? 100 : 0;
    const todayDate = new Date(Date.UTC(local.year, local.month, local.day, 12));
    const start = new Date(todayDate);
    start.setUTCDate(start.getUTCDate() - todayDate.getUTCDay());
    const startKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const endKey = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
    const inWeek = (createdAt: string) => {
      const key = getTanzaniaDateParts(createdAt)?.dateKey;
      return Boolean(key && key >= startKey && key < endKey);
    };
    const weekTxs = orders.filter(o => isRecognizedOrder(o) && inWeek(o.createdAt)).length + posTransactions.filter(t => inWeek(t.createdAt)).length;
    return {
      growthLastMonth: growth.toFixed(1),
      salesPerWeek: weekTxs,
    };
  }, [orders, posTransactions]);

  return (
    <>
      <div className="space-y-8">

            <div>

              <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Dashboard & Sales Analytics</h1>

              <p className={`text-sm mt-1 ${textSub}`}>Real-time overview of marketplace revenue, genuine stock levels, and POS transactions.</p>

            </div>



            {/* Metric Cards */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Total Revenue</span>

                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">

                    <DollarSign className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-black leading-tight tracking-tight whitespace-nowrap truncate ${textTitle}`} title={formatTZS(totalRevenue)}>

                    {formatTZS(totalRevenue)}

                  </div>

                  <span className={`text-xs ${Number(growthLastMonth) >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-semibold flex items-center gap-1 mt-1 truncate`}>

                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> {Number(growthLastMonth) >= 0 ? '+' : ''}{growthLastMonth}% from last month

                  </span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Inventory Valuation</span>

                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">

                    <Package className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-black leading-tight tracking-tight whitespace-nowrap truncate ${textTitle}`} title={formatTZS(totalInventoryValue)}>

                    {formatTZS(totalInventoryValue)}

                  </div>

                  <span className={`text-xs font-medium mt-1 truncate block ${textSub}`}>{products.reduce((a, c) => a + c.stock, 0)} units in stock</span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Online Orders</span>

                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">

                    <ShoppingCart className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-2xl sm:text-3xl font-black ${textTitle}`}>{orders.length}</div>

                  <span className="text-xs text-blue-500 font-semibold mt-1 truncate block">Pending fulfillment: {orders.filter(o => o.status === 'Processing').length}</span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Out of Stock Alerts</span>

                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">

                    <AlertTriangle className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-2xl sm:text-3xl font-black ${textTitle}`}>{lowStockProducts.length}</div>

                  <span className="text-xs text-rose-500 font-semibold mt-1 truncate block">Stock &lt; 1 (Sales blocked)</span>

                </div>

              </div>

            </div>



            {/* Sales Revenue Trends Analytics Dashboard Chart with High-Visibility Dropdown Filter */}

            <div className={`rounded-3xl border p-6 transition-all ${cardBg}`}>

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">

                <div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className={`text-lg font-extrabold tracking-tight ${textTitle}`}>

                      {chartTimeframe === 'daily' && 'Daily Sales Revenue Trends'}

                      {chartTimeframe === 'weekly' && 'Weekly Sales Revenue Trends'}

                      {chartTimeframe === 'yearly' && 'Yearly Sales Revenue Performance'}

                    </h3>

                  </div>

                  <p className={`text-xs mt-0.5 ${textSub}`}>

                    {chartTimeframe === 'daily' && 'Real-time daily revenue breakdown across POS terminal transactions and online store orders'}

                    {chartTimeframe === 'weekly' && 'Weekly aggregated revenue performance across POS terminal transactions and online store orders'}

                    {chartTimeframe === 'yearly' && 'Annual aggregated revenue trajectory comparing multi-year store performance'}

                  </p>

                </div>



                <div className="flex flex-wrap items-center gap-3">

                  {/* Quick Pill Buttons */}

                  <div className={`p-1 rounded-xl border flex items-center gap-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>

                    <button

                      onClick={() => setChartTimeframe('daily')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'daily'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Daily

                    </button>

                    <button

                      onClick={() => setChartTimeframe('weekly')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'weekly'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Weekly

                    </button>

                    <button

                      onClick={() => setChartTimeframe('yearly')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'yearly'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Yearly

                    </button>

                  </div>



                  {/* Legends */}

                  <div className="flex items-center gap-4 text-xs font-semibold">

                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>

                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Online

                    </div>

                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>

                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> POS

                    </div>

                    {chartTimeframe === 'weekly' && (

                      <div className={`flex items-center gap-1.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>

                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span> Weekly Trend Line

                      </div>

                    )}

                  </div>

                </div>

              </div>



              {/* Dynamic Quick Metrics Banner based on Dropdown Filter */}

              {(() => {

                const currentDataset = salesTrendData[chartTimeframe === 'daily' ? 'days' : chartTimeframe === 'weekly' ? 'weeks' : 'years'];

                let totalPeriodRev = 0;

                let totalTx = 0;

                for (const d of currentDataset as any[]) {

                  totalPeriodRev += d.revenue || 0;

                  totalTx += d.transactions || 0;

                }

                const peakRev = currentDataset.length > 0 ? Math.max(...currentDataset.map(d => d.revenue)) : 0;

                const avgRev = Math.round(totalPeriodRev / (currentDataset.length || 1));

                const latestRev = (currentDataset[currentDataset.length - 1] as any)?.revenue || 0;

                const avgTxs = Math.round(totalTx / (currentDataset.length || 1));



                return (

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3.5 rounded-2xl border bg-blue-500/5 border-blue-500/10">

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "Today's Revenue" : chartTimeframe === 'weekly' ? "This Week's Revenue" : "This Year's Revenue"}

                      </span>

                      <div className="text-sm font-black text-blue-500">{formatTZS(latestRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "7-Day Peak" : chartTimeframe === 'weekly' ? "4-Week Peak" : "Multi-Year Peak"}

                      </span>

                      <div className="text-sm font-black text-emerald-500">{formatTZS(peakRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "Daily Average" : chartTimeframe === 'weekly' ? "Weekly Average" : "Yearly Average"}

                      </span>

                      <div className={`text-sm font-black ${textTitle}`}>{formatTZS(avgRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        Avg Sales Volume

                      </span>

                      <div className="text-sm font-black text-indigo-400">

                        {avgTxs} {chartTimeframe === 'daily' ? 'sales/day' : chartTimeframe === 'weekly' ? 'sales/week' : 'sales/year'}

                      </div>

                    </div>

                  </div>

                );

              })()}



              <div className="w-full h-[350px] min-h-[350px]">

                <ResponsiveContainer width="100%" height={350}>

                  {chartTimeframe === 'weekly' ? (

                    <ComposedChart

                      data={salesTrendData.weeks}

                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}

                    >

                      <defs>

                        <linearGradient id="weeklyOnlineGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />

                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />

                        </linearGradient>

                        <linearGradient id="weeklyPosGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />

                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />

                        </linearGradient>

                        <linearGradient id="weeklyTotalGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />

                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />

                        </linearGradient>

                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeDasharray: '4 4' }}

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3.5 rounded-2xl border shadow-2xl text-xs space-y-2 min-w-[200px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-extrabold border-b pb-1.5 border-slate-700 flex justify-between items-center text-sm">

                                  <span>{data.fullLabel || data.label}</span>

                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-semibold">

                                  <span>Online Store:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-semibold">

                                  <span>POS Terminal:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 font-black text-sm">

                                  <span className="text-purple-400">Combined Total:</span>

                                  <span className="text-purple-400">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Area type="monotone" dataKey="onlineRevenue" name="Online Store" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#weeklyOnlineGrad)" />

                      <Area type="monotone" dataKey="posRevenue" name="POS Terminal" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#weeklyPosGrad)" />

                      <Line type="monotone" dataKey="revenue" name="Total Weekly Trend" stroke="#8b5cf6" strokeWidth={3.5} dot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 9, strokeWidth: 3 }} />

                    </ComposedChart>

                  ) : chartTimeframe === 'yearly' ? (

                    <AreaChart

                      data={salesTrendData.years}

                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}

                    >

                      <defs>

                        <linearGradient id="yearlyTotalGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />

                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />

                        </linearGradient>

                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3.5 rounded-2xl border shadow-2xl text-xs space-y-1.5 min-w-[190px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-extrabold border-b pb-1 border-slate-700 flex justify-between items-center text-sm">

                                  <span>{data.fullLabel}</span>

                                  <span className="text-[10px] text-blue-400 font-bold">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-semibold">

                                  <span>Online Channel:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-semibold">

                                  <span>POS Channel:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-slate-700 font-black text-sm">

                                  <span>Total Yearly:</span>

                                  <span className="text-blue-500">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#yearlyTotalGrad)" dot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />

                    </AreaChart>

                  ) : (

                    <BarChart

                      data={salesTrendData.days}

                      margin={{ top: 15, right: 10, left: 0, bottom: 0 }}

                    >

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[180px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-bold border-b pb-1 border-slate-700 flex justify-between items-center">

                                  <span>{data.fullLabel || data.label}</span>

                                  <span className="text-[10px] text-blue-400 font-normal">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-medium">

                                  <span>Online Store:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-medium">

                                  <span>POS Terminal:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-slate-700 font-black text-white">

                                  <span>Total Revenue:</span>

                                  <span className="text-blue-500">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Bar dataKey="onlineRevenue" name="Online Store" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />

                      <Bar dataKey="posRevenue" name="POS Terminal" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />

                    </BarChart>

                  )}

                </ResponsiveContainer>

              </div>

            </div>

            {/* Visitor Activity Heatmap Section on Admin Dashboard */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-extrabold tracking-tight ${textTitle}`}>
                    Store Traffic & Visitor Activity Heatmap
                  </h3>
                  <p className={`text-xs ${textSub}`}>
                    Visual peak hours & days analysis to schedule limited-time promotions and manage server loads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('visitor-analytics')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Full Visitor Analytics &amp; Logs</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <VisitorActivityHeatmap 
                heatmapData={dashboardVisitorSummary?.activityHeatmap}
                timeframe={heatmapTimeframe}
                onTimeframeChange={setHeatmapTimeframe}
                isDark={isDark}
              />

              {/* Top Viewed Products & Search-to-Product Correlation Breakdown */}
              <TopViewedProductsBreakdown
                products={dashboardVisitorSummary?.topProducts || []}
                onSelectProduct={() => setActiveTab('visitor-analytics')}
                onSelectSearchQuery={() => setActiveTab('visitor-analytics')}
                isDark={isDark}
              />
            </div>

            {/* Unpaid Loans & Debt Dashboard Widget */}
            {(() => {
              const unpaidLoans = (posTransactions || []).filter(tx => {
                if (!tx) return false;
                const pm = String(tx.paymentMethod || '').toLowerCase();
                const isLoan = Boolean(tx.isLoan) || pm.includes('loan') || pm.includes('credit') || pm.includes('mkopo') || pm.includes('debt') || pm.includes('deni');
                return isLoan && (Number(tx.loanBalance) || 0) > 0;
              });
              const totalOutstandingDebt = unpaidLoans.reduce((sum, tx) => sum + (Number(tx.loanBalance) || 0), 0);
              const overdueLoans = unpaidLoans.filter(tx => tx && tx.loanDueDate && !isNaN(new Date(tx.loanDueDate).getTime()) && new Date(tx.loanDueDate) < new Date());
              return (
                <div className={`rounded-3xl border p-6 transition-all ${cardBg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-extrabold tracking-tight ${textTitle}`}>Unpaid Loans & Customer Debt</h3>
                        <p className={`text-xs mt-1 ${textSub}`}>Monitor outstanding POS credit balances and collect repayments.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('loans')}
                      className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Manage All Repayments</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Outstanding Debt</span>
                      <div className="text-xl font-black text-amber-500 mt-1 truncate">{formatTZS(totalOutstandingDebt)}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Debtors</span>
                      <div className={`text-xl font-black mt-1 ${textTitle}`}>{unpaidLoans.length} Customers</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Overdue Payments</span>
                      <div className="text-xl font-black text-rose-600 mt-1">{overdueLoans.length} Loans</div>
                    </div>
                  </div>

                  {unpaidLoans.length > 0 ? (
                    <div className="overflow-x-auto w-full border rounded-2xl">
                      <table className="w-full text-left text-xs min-w-[600px]">
                        <thead>
                          <tr className={`border-b text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Original Sale</th>
                            <th className="p-3 text-right">Outstanding Debt</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                          {unpaidLoans.slice(0, 5).map(tx => (
                            <tr key={tx.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                              <td className="p-3">
                                <span className="font-bold">{tx.customerName || 'Walk-in Customer'}</span>
                                {tx.loanDueDate && (
                                  <span className={`block text-[10px] mt-0.5 ${new Date(tx.loanDueDate) < new Date() ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                                    Due: {new Date(tx.loanDueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-medium text-slate-500">{tx.customerPhone || 'N/A'}</td>
                              <td className="p-3 font-medium text-slate-500">{formatTZS(tx.total || tx.totalAmount || 0)}</td>
                              <td className="p-3 text-right">
                                <span className="font-black text-amber-500">{formatTZS(tx.loanBalance || 0)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-2xl border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-xs text-slate-500 font-medium">No unpaid loans or outstanding debt recorded.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Recent Orders & Low Stock Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-2 rounded-2xl border p-6 flex flex-col ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold ${textTitle}`}>Recent Online Orders</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    {orders.length} total
                  </span>
                </div>

                <div className="overflow-x-auto w-full max-h-[380px] overflow-y-auto scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="sticky top-0 z-10 shadow-xs">
                      <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg} backdrop-blur-xs`}>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            No online orders placed yet.
                          </td>
                        </tr>
                      ) : (
                        orders.slice(0, 20).map((o) => (
                          <tr key={o.id} className={`transition-colors ${tableRowHover}`}>
                            <td className={`p-3 font-bold font-mono text-[11px] ${textTitle}`}>{o.id}</td>
                            <td className={`p-3 truncate max-w-[140px] ${textSub}`} title={o.customerName}>{o.customerName}</td>
                            <td className={`p-3 font-extrabold whitespace-nowrap ${textTitle}`}>{formatTZS(o.totalAmount)}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] border inline-flex items-center gap-1 ${
                                o.status === 'Delivered'
                                  ? isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : o.status === 'Shipped'
                                  ? isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200'
                                  : isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <select
                                value={o.status}
                                onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}
                                className={`border rounded-lg px-2 py-1 text-xs font-semibold ${
                                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>



              {/* Out of Stock / Empty Stock Watch */}

              <div className={`rounded-2xl border p-6 ${cardBg}`}>

                <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${textTitle}`}>

                  <AlertTriangle className="w-5 h-5 text-rose-500" />

                  <span>Empty Stock Watch (Stock &lt; 1)</span>

                </h3>

                {lowStockProducts.length === 0 ? (

                  <p className={`text-xs py-6 text-center ${textSub}`}>All inventory stock levels are healthy (no empty stock).</p>

                ) : (

                  <div className="space-y-3">

                    {lowStockProducts.map((p) => (

                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${

                        isDark ? 'bg-rose-950/30 border-rose-800/60' : 'bg-rose-50/50 border-rose-200'

                      }`}>

                        <div>

                          <h4 className={`font-bold text-xs line-clamp-1 ${textTitle}`}>{p.name}</h4>

                          <span className="text-[11px] text-rose-500 font-bold">Empty stock: {p.stock} remaining (Cannot sell)</span>

                        </div>

                        <button

                          onClick={() => handleOpenEditModal(p)}

                          className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors"

                        >

                          Restock

                        </button>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          </div>

        
    </>
  );
};
