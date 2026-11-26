import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Download,
  Trash2,
  Receipt,
  User,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Eye,
  Smartphone,
  CreditCard,
  Wallet,
  Building2,
  Layers,
  CircleDollarSign,
  Percent,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Undo2,
  RotateCcw
} from 'lucide-react';
import { POSTransaction, SaleReturn, StoreSettings, Order } from '../types';
import { isLoanTransaction } from '../utils/loanUtils';
import { customAlert, customConfirm } from '../utils/dialog';
import {
  isCompletedSaleReturn,
  getSaleReturnAmount,
  getSaleReturnCreatedAt,
  getSaleReturnMethod,
  buildTransactionReturnSummaryMap,
  matchSaleReturnToTransaction,
} from '../utils/salesReturnUtils';

interface POSSalesHistoryProps {
  posTransactions: POSTransaction[];
  orders?: Order[];
  salesReturns?: SaleReturn[];
  storeSettings?: StoreSettings;
  onOpenReceipt: (tx: POSTransaction) => void;
  onOpenSalesReturns?: () => void;
  onDeleteTransaction?: (id: string) => Promise<void> | void;
  onClearAllTransactions?: () => Promise<void> | void;
  isDark: boolean;
  cardBg: string;
  inputBg: string;
  textTitle: string;
  textSub: string;
  showConfirm?: (title: string, message: string, onConfirm: () => void, type?: 'confirm' | 'warning') => void;
  showAlert?: (title: string, message: string, type?: 'alert' | 'error' | 'warning') => void;
}

// Canonical payment method metadata for Tanzania & Counter POS
const KNOWN_PAYMENT_CONFIGS = [
  {
    key: 'M-Pesa',
    matchTerms: ['m-pesa', 'mpesa', 'vodacom'],
    label: 'M-Pesa',
    subLabel: 'Vodacom Tanzania',
    icon: Smartphone,
    colorClass: 'text-red-500',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    cardBorder: 'border-red-500/30 hover:border-red-500',
    activeRing: 'ring-2 ring-red-500 border-red-500 bg-red-500/5 dark:bg-red-950/30',
    progressColor: 'bg-red-500',
  },
  {
    key: 'Airtel Money',
    matchTerms: ['airtel', 'airtel money'],
    label: 'Airtel Money',
    subLabel: 'Airtel Tanzania',
    icon: Smartphone,
    colorClass: 'text-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    cardBorder: 'border-rose-500/30 hover:border-rose-500',
    activeRing: 'ring-2 ring-rose-500 border-rose-500 bg-rose-500/5 dark:bg-rose-950/30',
    progressColor: 'bg-rose-500',
  },
  {
    key: 'Tigo Pesa',
    matchTerms: ['tigo', 'tigo pesa', 'mixx', 'yas'],
    label: 'Tigo Pesa',
    subLabel: 'Mixx by Yas',
    icon: Smartphone,
    colorClass: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    cardBorder: 'border-blue-500/30 hover:border-blue-500',
    activeRing: 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/5 dark:bg-blue-950/30',
    progressColor: 'bg-blue-500',
  },
  {
    key: 'Halopesa',
    matchTerms: ['halo', 'halopesa', 'halotel'],
    label: 'Halopesa',
    subLabel: 'Halotel Pesa',
    icon: CircleDollarSign,
    colorClass: 'text-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    cardBorder: 'border-orange-500/30 hover:border-orange-500',
    activeRing: 'ring-2 ring-orange-500 border-orange-500 bg-orange-500/5 dark:bg-orange-950/30',
    progressColor: 'bg-orange-500',
  },
  {
    key: 'Cash',
    matchTerms: ['cash', 'taslimu', 'pesa taslimu'],
    label: 'Cash',
    subLabel: 'Counter Taslimu',
    icon: Wallet,
    colorClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    cardBorder: 'border-emerald-500/30 hover:border-emerald-500',
    activeRing: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/30',
    progressColor: 'bg-emerald-500',
  },
  {
    key: 'Bank / Card',
    matchTerms: ['bank', 'card', 'crdb', 'nmb', 'visa', 'mastercard', 'transfer', 'pos card'],
    label: 'Bank / Card',
    subLabel: 'CRDB / NMB / Visa',
    icon: Building2,
    colorClass: 'text-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    cardBorder: 'border-indigo-500/30 hover:border-indigo-500',
    activeRing: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/30',
    progressColor: 'bg-indigo-500',
  },
  {
    key: 'Credit / Loan',
    matchTerms: ['credit', 'loan', 'deni', 'mikopo'],
    label: 'Credit / Loan',
    subLabel: 'Deni / Customer Loan',
    icon: Layers,
    colorClass: 'text-violet-500',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    cardBorder: 'border-violet-500/30 hover:border-violet-500',
    activeRing: 'ring-2 ring-violet-500 border-violet-500 bg-violet-500/5 dark:bg-violet-950/30',
    progressColor: 'bg-violet-500',
  }
];

export const POSSalesHistory: React.FC<POSSalesHistoryProps> = ({
  posTransactions = [],
  orders = [],
  salesReturns = [],
  storeSettings,
  onOpenReceipt,
  onOpenSalesReturns,
  onDeleteTransaction,
  onClearAllTransactions,
  isDark,
  cardBg,
  inputBg,
  textTitle,
  textSub,
  showConfirm,
  showAlert,
}) => {
  const safeConfirm = async (title: string, message: string, onConfirm: () => void, type?: 'confirm' | 'warning') => {
    if (showConfirm) {
      showConfirm(title, message, onConfirm, type);
    } else if (await customConfirm(message, title)) {
      onConfirm();
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [customDate, setCustomDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingTx, setViewingTx] = useState<POSTransaction | null>(null);

  // Combine POS transactions and any completed orders (so completed orders shift to Sales History)
  const allTransactions = useMemo(() => {
    const list: POSTransaction[] = [...(posTransactions || [])];
    const existingIds = new Set<string>();
    list.forEach(tx => {
      if (tx.id) existingIds.add(tx.id);
      if (tx.receiptNumber) existingIds.add(tx.receiptNumber);
    });

    (orders || []).forEach(o => {
      const pStat = (o.paymentStatus || o.payment_status || '').toLowerCase();
      const oStat = (o.status || '').toLowerCase();
      const isCompleted = pStat === 'paid' || oStat === 'completed' || oStat === 'delivered';
      if (isCompleted && !existingIds.has(o.id) && !(o.quotationNumber && existingIds.has(o.quotationNumber))) {
        existingIds.add(o.id);
        list.push({
          id: o.id,
          receiptNumber: o.quotationNumber || `ORD-${o.id.slice(-6)}`,
          createdAt: o.createdAt || new Date().toISOString(),
          cashierName: o.cashierName || 'Counter Cashier',
          customerName: o.customerName || o.customer_name || 'Customer',
          customerPhone: o.customerPhone || o.customer_phone || o.phone || '',
          items: (o.items || []).map(i => ({
            product: i.product,
            quantity: i.quantity,
            price: i.price || i.product?.price || 0
          })),
          subtotal: o.subtotal || o.totalAmount || 0,
          tax: o.tax || 0,
          discount: o.discount || 0,
          total: o.totalAmount || 0,
          totalAmount: o.totalAmount || 0,
          paymentMethod: o.paymentMethod || 'Completed Order',
          status: 'Completed',
          notes: o.notes || 'Completed Order'
        });
      }
    });

    return list;
  }, [posTransactions, orders]);

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatToGMT3 = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-GB', {
        timeZone: 'Africa/Dar_es_Salaam',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const q = (searchQuery || '').toLowerCase().trim();
  const filterMethod = (paymentMethodFilter || '').toLowerCase().trim();

  const matchesActiveDateFilter = (dateValue?: string): boolean => {
    if (dateFilter === 'All Time') return true;
    if (!dateValue) return false;
    const txDate = new Date(dateValue);
    if (Number.isNaN(txDate.getTime())) return false;
    const now = new Date();

    if (dateFilter === 'Today') {
      return txDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return txDate.toDateString() === yesterday.toDateString();
    } else if (dateFilter === 'This Week') {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);
      return txDate >= firstDayOfWeek;
    } else if (dateFilter === 'This Month') {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    } else if (dateFilter === 'Custom Date' && customDate) {
      const customD = new Date(customDate + 'T00:00:00');
      return (
        txDate.getFullYear() === customD.getFullYear() &&
        txDate.getMonth() === customD.getMonth() &&
        txDate.getDate() === customD.getDate()
      );
    }
    return true;
  };

  // Pre-build return map across all transactions so every receipt row accurately displays refund history
  const allReturnSummaryMap = useMemo(
    () => buildTransactionReturnSummaryMap(allTransactions, salesReturns),
    [allTransactions, salesReturns]
  );

  // 1. Transactions matching Search Query & Date Filter (base scope for payment breakdown)
  const basePeriodTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchesSearch =
        !q ||
        (tx.id || '').toLowerCase().includes(q) ||
        (tx.receiptNumber || '').toLowerCase().includes(q) ||
        (tx.cashierName || '').toLowerCase().includes(q) ||
        (tx.customerName || '').toLowerCase().includes(q) ||
        (tx.paymentMethod || '').toLowerCase().includes(q) ||
        (tx.items || []).some((item) =>
          (item.product?.name || '').toLowerCase().includes(q)
        );

      return matchesSearch && matchesActiveDateFilter(tx.createdAt);
    });
  }, [allTransactions, q, dateFilter, customDate]);

  // Completed sales returns matching current period & search scope
  const completedSalesReturns = useMemo(
    () => (salesReturns || []).filter(isCompletedSaleReturn),
    [salesReturns]
  );

  const periodReturns = useMemo(() => {
    return completedSalesReturns.filter((ret) => {
      const created = getSaleReturnCreatedAt(ret);
      if (!matchesActiveDateFilter(created)) return false;
      if (!q) return true;
      const rNum = String(ret.returnNumber || ret.return_number || '').toLowerCase();
      const rcp = String(ret.receiptNumber || ret.receipt_number || '').toLowerCase();
      const cName = String(ret.customerName || ret.customer_name || '').toLowerCase();
      const processedBy = String(ret.processedBy || ret.processed_by || '').toLowerCase();
      const itemsMatch = (ret.items || []).some((it) => (it.productName || '').toLowerCase().includes(q));
      const linkedTxMatches = basePeriodTransactions.some((tx) => matchSaleReturnToTransaction(ret, tx));
      return rNum.includes(q) || rcp.includes(q) || cName.includes(q) || processedBy.includes(q) || itemsMatch || linkedTxMatches;
    });
  }, [completedSalesReturns, basePeriodTransactions, q, dateFilter, customDate]);

  // Normalize payment method string into canonical group
  const dynamicPaymentConfigs = useMemo(() => {
    const baseConfigs = [...KNOWN_PAYMENT_CONFIGS];
    if (!storeSettings?.paymentMethods || storeSettings.paymentMethods.length === 0) {
      return baseConfigs;
    }

    const configs = [];
    const cashCfg = baseConfigs.find(c => c.key === 'Cash');
    const creditCfg = baseConfigs.find(c => c.key === 'Credit / Loan');
    
    if (cashCfg) configs.push(cashCfg);
    if (creditCfg) configs.push(creditCfg);

    storeSettings.paymentMethods.filter(m => m.isActive !== false).forEach(m => {
      const p = String(m?.provider || '').toLowerCase();
      let colorClass = 'text-blue-500';
      let badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      let cardBorder = 'border-blue-500/30 hover:border-blue-500';
      let activeRing = 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/5 dark:bg-blue-950/30';
      let progressColor = 'bg-blue-500';
      let icon = Smartphone;

      if (p.includes('m-pesa') || p.includes('vodacom')) {
        colorClass = 'text-red-500'; badgeClass = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'; cardBorder = 'border-red-500/30 hover:border-red-500'; activeRing = 'ring-2 ring-red-500 border-red-500 bg-red-500/5 dark:bg-red-950/30'; progressColor = 'bg-red-500';
      } else if (p.includes('airtel')) {
        colorClass = 'text-rose-500'; badgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'; cardBorder = 'border-rose-500/30 hover:border-rose-500'; activeRing = 'ring-2 ring-rose-500 border-rose-500 bg-rose-500/5 dark:bg-rose-950/30'; progressColor = 'bg-rose-500';
      } else if (p.includes('tigo') || p.includes('mixx') || p.includes('yas')) {
        colorClass = 'text-blue-500'; badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'; cardBorder = 'border-blue-500/30 hover:border-blue-500'; activeRing = 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/5 dark:bg-blue-950/30'; progressColor = 'bg-blue-500';
      } else if (p.includes('halo')) {
        colorClass = 'text-orange-500'; badgeClass = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'; cardBorder = 'border-orange-500/30 hover:border-orange-500'; activeRing = 'ring-2 ring-orange-500 border-orange-500 bg-orange-500/5 dark:bg-orange-950/30'; progressColor = 'bg-orange-500'; icon = CircleDollarSign;
      } else if (m.type === 'Bank Transfer' || p.includes('bank') || p.includes('crdb') || p.includes('nmb')) {
        colorClass = 'text-indigo-500'; badgeClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'; cardBorder = 'border-indigo-500/30 hover:border-indigo-500'; activeRing = 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/30'; progressColor = 'bg-indigo-500'; icon = Building2;
      }

      configs.push({
        key: m.provider,
        matchTerms: [String(m?.provider || '').toLowerCase(), String(m?.accountName || '').toLowerCase(), String(m?.accountNumber || '').toLowerCase()],
        label: m.provider,
        subLabel: `${m.accountName} - ${m.accountNumber}`,
        icon,
        colorClass,
        badgeClass,
        cardBorder,
        activeRing,
        progressColor
      });
    });

    return configs;
  }, [storeSettings]);

  const getCanonicalGroup = (methodRaw: string) => {
    const m = (methodRaw || '').toLowerCase().trim();
    for (const cfg of dynamicPaymentConfigs) {
      if (cfg.matchTerms.some((term) => m.includes(term))) {
        return cfg.key;
      }
    }
    return methodRaw || 'Cash';
  };

  // Resolve which canonical payment channel a SaleReturn deducts from
  const resolveReturnChannel = (ret: SaleReturn): string => {
    const linkedTx = allTransactions.find((tx) => matchSaleReturnToTransaction(ret, tx));
    const retMethod = getSaleReturnMethod(ret);
    if (linkedTx) {
      // For Mobile Money refunds on a specific mobile wallet sale (e.g. M-Pesa / Tigo Pesa), keep the linked channel aligned
      if (retMethod === 'Mobile Money' || retMethod === linkedTx.paymentMethod) {
        if (linkedTx.splitPayments && linkedTx.splitPayments.length > 0) {
          return getCanonicalGroup(linkedTx.splitPayments[0].method);
        }
        return getCanonicalGroup(linkedTx.paymentMethod || retMethod);
      }
    }
    return getCanonicalGroup(retMethod);
  };

  // 2. Compute dynamic Payment Methods Breakdown from basePeriodTransactions minus periodReturns
  const paymentBreakdownData = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        label: string;
        subLabel: string;
        amount: number;
        grossAmount: number;
        refundedAmount: number;
        count: number;
        refundCount: number;
        icon: any;
        colorClass: string;
        badgeClass: string;
        cardBorder: string;
        activeRing: string;
        progressColor: string;
      }
    > = {};

    const ensureBucket = (group: string) => {
      if (!map[group]) {
        map[group] = {
          key: group,
          label: group,
          subLabel: 'Other Payment',
          amount: 0,
          grossAmount: 0,
          refundedAmount: 0,
          count: 0,
          refundCount: 0,
          icon: CircleDollarSign,
          colorClass: 'text-slate-400',
          badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          cardBorder: 'border-slate-500/30 hover:border-slate-400',
          activeRing: 'ring-2 ring-slate-400 border-slate-400',
          progressColor: 'bg-slate-400',
        };
      }
      return map[group];
    };

    // Initialize all standard payment configs with 0
    dynamicPaymentConfigs.forEach((cfg) => {
      map[cfg.key] = {
        key: cfg.key,
        label: cfg.label,
        subLabel: cfg.subLabel,
        amount: 0,
        grossAmount: 0,
        refundedAmount: 0,
        count: 0,
        refundCount: 0,
        icon: cfg.icon,
        colorClass: cfg.colorClass,
        badgeClass: cfg.badgeClass,
        cardBorder: cfg.cardBorder,
        activeRing: cfg.activeRing,
        progressColor: cfg.progressColor,
      };
    });

    let totalPeriodGross = 0;

    basePeriodTransactions.forEach((tx) => {
      const txTotal = tx.total ?? tx.totalAmount ?? 0;
      totalPeriodGross += txTotal;

      if (tx.splitPayments && tx.splitPayments.length > 0) {
        tx.splitPayments.forEach((sp) => {
          const group = getCanonicalGroup(sp.method);
          const bucket = ensureBucket(group);
          const spAmt = sp.amount || 0;
          bucket.grossAmount += spAmt;
          bucket.amount += spAmt;
          bucket.count += 1;
        });
      } else {
        const group = getCanonicalGroup(tx.paymentMethod || 'Cash');
        const bucket = ensureBucket(group);
        bucket.grossAmount += txTotal;
        bucket.amount += txTotal;
        bucket.count += 1;
      }
    });

    let totalPeriodReturns = 0;
    periodReturns.forEach((ret) => {
      const rAmount = getSaleReturnAmount(ret);
      totalPeriodReturns += rAmount;
      const group = resolveReturnChannel(ret);
      const bucket = ensureBucket(group);
      bucket.refundedAmount += rAmount;
      bucket.refundCount += 1;
      bucket.amount = Math.max(0, bucket.amount - rAmount);
    });

    const totalPeriodRevenue = Math.max(0, totalPeriodGross - totalPeriodReturns);

    // Convert map to array and sort so active methods (amount > 0) appear first
    const list = Object.values(map).sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return b.count - a.count;
    });

    return { list, totalPeriodRevenue, totalPeriodGross, totalPeriodReturns };
  }, [basePeriodTransactions, periodReturns, dynamicPaymentConfigs, allTransactions]);

  // 3. Final filtered transactions applying payment method filter as well
  const filteredTransactions = useMemo(() => {
    if (paymentMethodFilter === 'All') return basePeriodTransactions;

    const targetLower = String(paymentMethodFilter || '').toLowerCase().trim();
    return basePeriodTransactions.filter((tx) => {
      if (tx.splitPayments && tx.splitPayments.length > 0) {
        return tx.splitPayments.some((sp) => {
          const group = getCanonicalGroup(sp.method);
          return (
            String(group || '').toLowerCase() === targetLower ||
            (sp.method || '').toLowerCase().includes(targetLower)
          );
        });
      }
      const group = getCanonicalGroup(tx.paymentMethod || 'Cash');
      return (
        String(group || '').toLowerCase() === targetLower ||
        (tx.paymentMethod || '').toLowerCase().includes(targetLower)
      );
    });
  }, [basePeriodTransactions, paymentMethodFilter]);

  const totalPOSGrossRevenue = posTransactions.reduce(
    (sum, tx) => sum + (tx.total ?? tx.totalAmount ?? 0),
    0
  );
  const totalPOSReturnsAmount = completedSalesReturns.reduce(
    (sum, r) => sum + getSaleReturnAmount(r),
    0
  );
  const totalPOSRevenue = Math.max(0, totalPOSGrossRevenue - totalPOSReturnsAmount);

  const filteredPOSGrossRevenue = filteredTransactions.reduce(
    (sum, tx) => sum + (tx.total ?? tx.totalAmount ?? 0),
    0
  );
  const filteredMethodReturnsAmount = useMemo(() => {
    if (paymentMethodFilter === 'All') {
      return paymentBreakdownData.totalPeriodReturns;
    }
    const targetLower = String(paymentMethodFilter || '').toLowerCase().trim();
    return periodReturns
      .filter((ret) => resolveReturnChannel(ret).toLowerCase() === targetLower)
      .reduce((sum, r) => sum + getSaleReturnAmount(r), 0);
  }, [paymentMethodFilter, paymentBreakdownData.totalPeriodReturns, periodReturns, allTransactions]);

  const filteredPOSRevenue = Math.max(0, filteredPOSGrossRevenue - filteredMethodReturnsAmount);
  const averageOrderValue =
    basePeriodTransactions.length > 0
      ? paymentBreakdownData.totalPeriodRevenue / basePeriodTransactions.length
      : 0;

  // Options for payment method dropdown
  const paymentMethods = [
    'All',
    ...dynamicPaymentConfigs.map(c => c.label)
  ];

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      customAlert('No transactions to export.');
      return;
    }
    const headers = [
      'Receipt ID',
      'Date',
      'Cashier',
      'Customer',
      'Payment Method',
      'Items Count',
      'Gross Amount',
      'Returned Amount',
      'Net Amount',
      'Status',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map((tx) => {
        const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '';
        const itemsCount = (tx.items || []).reduce((a, c) => a + c.quantity, 0);
        const amount = tx.total ?? tx.totalAmount ?? 0;
        const retInfo = allReturnSummaryMap.byTxId[tx.id];
        const returnedAmt = retInfo?.returnedAmount || 0;
        const netAmt = Math.max(0, amount - returnedAmt);
        const statusLabel = retInfo?.isFullyRefunded ? 'Refunded' : retInfo?.isPartiallyRefunded ? 'Partial Return' : (tx.status || 'Completed');
        return [
          `"${tx.receiptNumber || tx.id}"`,
          `"${dateStr}"`,
          `"${tx.cashierName || 'Admin'}"`,
          `"${tx.customerName || 'Walk-in'}"`,
          `"${tx.paymentMethod || 'Cash'}"`,
          itemsCount,
          amount,
          returnedAmt,
          netAmt,
          `"${statusLabel}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pos_sales_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((tx) => tx.id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight ${textTitle}`}>
            POS Sales History & Registers
          </h2>
          <p className={`text-xs mt-0.5 ${textSub}`}>
            View and audit offline counter sales, track returns & refunds, filter payment channels, and reprint receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {posTransactions.length} Sales Registered
          </span>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isDark
                ? 'bg-blue-950/40 border-blue-800 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
            title={totalPOSReturnsAmount > 0 ? `Gross: ${formatTZS(totalPOSGrossRevenue)} minus Returns: ${formatTZS(totalPOSReturnsAmount)}` : undefined}
          >
            {formatTZS(totalPOSRevenue)} Net Revenue
          </span>

          {totalPOSReturnsAmount > 0 && (
            <button
              type="button"
              onClick={() => onOpenSalesReturns && onOpenSalesReturns()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                onOpenSalesReturns ? 'cursor-pointer hover:bg-rose-500/20' : 'cursor-default'
              } ${
                isDark
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
              title="Completed sales returns deducted from net revenue"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>-{formatTZS(totalPOSReturnsAmount)} Returns ({completedSalesReturns.length})</span>
            </button>
          )}

          {selectedIds.length > 0 && onDeleteTransaction && (
            <button
              onClick={() => {
                safeConfirm(
                  'Delete Transactions',
                  `Are you sure you want to delete the ${selectedIds.length} selected POS sales transactions?`,
                  async () => {
                    for (const id of selectedIds) {
                      await onDeleteTransaction(id);
                    }
                    setSelectedIds([]);
                  },
                  'warning'
                );
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          {posTransactions.length > 0 && onClearAllTransactions && (
            <button
              onClick={() => {
                safeConfirm(
                  'Clear All Records',
                  'Are you sure you want to delete ALL POS sales history records? This action cannot be undone.',
                  async () => {
                    await onClearAllTransactions();
                  },
                  'warning'
                );
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className={`p-4 rounded-2xl border ${cardBg} ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        } space-y-3`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Cashier, Customer, Receipt ID, SKU, product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all ${inputBg}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Method Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputBg}`}
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method === 'All' ? 'All Payment Methods' : method}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none ${inputBg}`}
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom Date">Specific Date</option>
              </select>
            </div>

            {dateFilter === 'Custom Date' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold ${inputBg}`}
              />
            )}

            <button
              onClick={handleExportCSV}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        {(searchQuery || paymentMethodFilter !== 'All' || dateFilter !== 'All Time') && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={textSub}>
                Filtered: <strong>{filteredTransactions.length}</strong> of{' '}
                <strong>{posTransactions.length}</strong> receipts
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-bold text-emerald-500">
                Net Volume: {formatTZS(filteredPOSRevenue)}
              </span>
              {filteredMethodReturnsAmount > 0 && (
                <span className="font-bold text-rose-500">
                  (-{formatTZS(filteredMethodReturnsAmount)} Returns)
                </span>
              )}
              {paymentMethodFilter !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                  Channel: {paymentMethodFilter}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setPaymentMethodFilter('All');
                setDateFilter('All Time');
                setCustomDate('');
              }}
              className="text-xs text-blue-500 hover:underline font-bold"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* 🌟 PAYMENT METHODS SUMMARY CARDS (Dynamic & Filter-Aware) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle}`}>
              Payment Method Breakdown ({dateFilter === 'All Time' ? 'All Period' : dateFilter})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any card to filter transactions by that payment channel (returns deducted)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Master "All Methods" Card */}
          <div
            onClick={() => setPaymentMethodFilter('All')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
              paymentMethodFilter === 'All'
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/5 dark:bg-blue-950/30'
                : `${cardBg} ${isDark ? 'border-slate-800' : 'border-slate-200'}`
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Layers className="w-4 h-4" />
                </div>
                {paymentMethodFilter === 'All' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-extrabold mt-2 ${textTitle}`}>All Methods</p>
              <span className="text-[10px] text-slate-400 block font-medium">Net Combined Total</span>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 truncate">
                {formatTZS(paymentBreakdownData.totalPeriodRevenue)}
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                {basePeriodTransactions.length} receipts (100%)
              </span>
              {paymentBreakdownData.totalPeriodReturns > 0 && (
                <span className="text-[9.5px] text-rose-500 font-bold block mt-0.5 truncate">
                  Returns: -{formatTZS(paymentBreakdownData.totalPeriodReturns)}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Payment Method Cards */}
          {paymentBreakdownData.list.map((method) => {
            const Icon = method.icon;
            const isSelected = (paymentMethodFilter || '').toLowerCase() === (method.key || '').toLowerCase();
            const pct =
              paymentBreakdownData.totalPeriodRevenue > 0
                ? Math.round((method.amount / paymentBreakdownData.totalPeriodRevenue) * 100)
                : 0;

            return (
              <div
                key={method.key}
                onClick={() => {
                  if (isSelected) {
                    setPaymentMethodFilter('All');
                  } else {
                    setPaymentMethodFilter(method.key);
                  }
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between group ${
                  isSelected
                    ? method.activeRing
                    : `${cardBg} ${isDark ? 'border-slate-800' : 'border-slate-200'} ${method.cardBorder}`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${method.badgeClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected ? (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                        Selected
                      </span>
                    ) : method.amount > 0 ? (
                      <span className="text-[10px] font-extrabold text-slate-400">
                        {pct}%
                      </span>
                    ) : null}
                  </div>

                  <p className={`text-[11px] font-extrabold mt-2 group-hover:text-blue-500 transition-colors ${textTitle}`}>
                    {method.label}
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium truncate">
                    {method.subLabel}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <h4 className={`text-xs sm:text-sm font-black truncate ${method.amount > 0 ? textTitle : 'text-slate-400 opacity-60'}`}>
                    {formatTZS(method.amount)}
                  </h4>

                  {/* Share Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${method.progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(method.amount > 0 ? 5 : 0, pct))}%` }}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {method.count} {method.count === 1 ? 'sale' : 'sales'}
                    {method.refundedAmount > 0 && (
                      <span className="text-rose-500 font-bold ml-1">(-{formatTZS(method.refundedAmount)})</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl border ${cardBg} ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>
                Active Scope Net Revenue
              </p>
              <h3 className={`text-base font-black mt-0.5 text-emerald-600 dark:text-emerald-400 truncate`}>
                {formatTZS(filteredPOSRevenue)}
              </h3>
              {filteredMethodReturnsAmount > 0 && (
                <p className="text-[10px] text-rose-500 font-semibold truncate">
                  Gross {formatTZS(filteredPOSGrossRevenue)} · -{formatTZS(filteredMethodReturnsAmount)} returns
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${cardBg} ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>
                Transactions
              </p>
              <h3 className={`text-base font-black mt-0.5 ${textTitle}`}>
                {filteredTransactions.length} receipts
              </h3>
            </div>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${cardBg} ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="p-2.5 bg-purple-600/10 text-purple-500 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>
              Avg. Ticket
            </p>
            <h3 className={`text-base font-black mt-0.5 ${textTitle}`}>
              {formatTZS(averageOrderValue)}
            </h3>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${cardBg} ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/10 text-amber-500 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>
                Active Staff
              </p>
              <h3 className={`text-base font-black mt-0.5 ${textTitle}`}>
                {new Set(filteredTransactions.map((tx) => tx.cashierName).filter(Boolean)).size || 1} Cashiers
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${cardBg} ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase text-[10px] font-black tracking-wider border-b ${
                isDark
                  ? 'bg-slate-900/90 text-slate-400 border-slate-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <tr>
                <th className="px-2 py-3 w-8 text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-200">
                    {selectedIds.length > 0 && selectedIds.length === filteredTransactions.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-2.5 py-3">Receipt #</th>
                <th className="px-2.5 py-3">Date & Time</th>
                <th className="px-2.5 py-3">Cashier</th>
                <th className="px-2.5 py-3">Customer</th>
                <th className="px-2.5 py-3">Payment</th>
                <th className="px-2.5 py-3">Items</th>
                <th className="px-2.5 py-3">Total Amount</th>
                <th className="px-2.5 py-3 text-center">Receipt</th>
                <th className="px-2.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  const isLoan = isLoanTransaction(tx);
                  const itemsCount = (tx.items || []).reduce((a, c) => a + c.quantity, 0);
                  const amount = tx.total ?? tx.totalAmount ?? 0;
                  const retSummary = allReturnSummaryMap.byTxId[tx.id];
                  const returnedAmount = retSummary?.returnedAmount || 0;
                  const netAmount = retSummary ? retSummary.netAmount : amount;
                  const isRefunded = retSummary?.isFullyRefunded || tx.status === 'Refunded';
                  const isPartialReturn = Boolean(retSummary?.isPartiallyRefunded);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? (isDark ? 'bg-slate-800/40' : 'bg-blue-50/40') : ''
                      }`}
                    >
                      <td className="px-2 py-3 w-8 text-center">
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedIds(selectedIds.filter((id) => id !== tx.id));
                            } else {
                              setSelectedIds([...selectedIds, tx.id]);
                            }
                          }}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-2.5 py-3 font-bold font-mono text-blue-500 whitespace-nowrap">
                        <div>{tx.receiptNumber || tx.id.slice(0, 8)}</div>
                        {(isRefunded || isPartialReturn) && (
                          <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            isRefunded
                              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            <RotateCcw className="w-2.5 h-2.5" />
                            {isRefunded ? 'Refunded' : 'Partial Return'}
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatToGMT3(tx.createdAt)}
                      </td>
                      <td className="px-2.5 py-3 font-medium max-w-[120px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{tx.cashierName || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-3 max-w-[140px]">
                        <div className="font-medium truncate">{tx.customerName || 'Walk-in Customer'}</div>
                        {tx.customerPhone && (
                          <div className="text-[10px] text-slate-400 truncate">{tx.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-2.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {tx.splitPayments && tx.splitPayments.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              Split ({tx.splitPayments.length})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {tx.paymentMethod || 'Cash'}
                            </span>
                          )}
                          {isLoan && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              LOAN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-3 font-medium whitespace-nowrap">{itemsCount} items</td>
                      <td className="px-2.5 py-3 font-black whitespace-nowrap">
                        {returnedAmount > 0 ? (
                          <div>
                            <div className={isRefunded ? 'text-rose-500' : 'text-emerald-500'}>
                              {formatTZS(netAmount)}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 line-through">
                              {formatTZS(amount)}
                            </div>
                            <div className="text-[10px] font-bold text-rose-500">
                              -{formatTZS(returnedAmount)} returned
                            </div>
                          </div>
                        ) : (
                          <span className={isRefunded ? 'text-rose-500 line-through' : 'text-emerald-500'}>
                            {formatTZS(amount)}
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onOpenReceipt(tx)}
                          className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white transition-all shadow-sm"
                          title="Reprint / View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-2.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingTx(tx)}
                            className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500 text-slate-400 hover:text-white transition-all"
                            title="Quick View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onDeleteTransaction && (
                            <button
                              onClick={() => {
                                safeConfirm(
                                  'Delete Transaction',
                                  `Delete POS transaction receipt "${tx.receiptNumber || tx.id}"?`,
                                  () => onDeleteTransaction(tx.id),
                                  'warning'
                                );
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white transition-all"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 ${cardBg} ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className={`text-base font-extrabold ${textTitle}`}>
                  Transaction #{viewingTx.receiptNumber || viewingTx.id}
                </h3>
                <p className="text-[11px] text-slate-400">{formatToGMT3(viewingTx.createdAt)}</p>
              </div>
              <button
                onClick={() => setViewingTx(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Cashier:</span>
                <span className="font-bold">{viewingTx.cashierName || 'Admin'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold">{viewingTx.customerName || 'Walk-in'}</span>
              </div>
              {viewingTx.customerPhone && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono">{viewingTx.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-bold text-blue-500">{viewingTx.paymentMethod || 'Cash'}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Purchased Items ({viewingTx.items?.length || 0})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(viewingTx.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold truncate">{item.product?.name || 'Product'}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} x {formatTZS(item.price)}
                      </p>
                    </div>
                    <span className="font-black text-emerald-500 whitespace-nowrap">
                      {formatTZS(item.quantity * item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(() => {
              const retSummary = allReturnSummaryMap.byTxId[viewingTx.id];
              const grossPaid = viewingTx.total ?? viewingTx.totalAmount ?? 0;
              const retAmt = retSummary?.returnedAmount || 0;
              const netPaid = Math.max(0, grossPaid - retAmt);
              return (
                <>
                  {retSummary && retSummary.returns.length > 0 && (
                    <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-black text-rose-500">
                        <span className="flex items-center gap-1.5">
                          <Undo2 className="w-3.5 h-3.5" />
                          Sales Returns Recorded ({retSummary.returns.length})
                        </span>
                        <span>-{formatTZS(retAmt)}</span>
                      </div>
                      {retSummary.returns.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {r.returnNumber || r.return_number || r.id} · {getSaleReturnMethod(r)}
                          </span>
                          <span className="font-bold text-rose-400">-{formatTZS(getSaleReturnAmount(r))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {retAmt > 0 ? 'Net Revenue (After Returns)' : 'Total Paid'}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <h3 className={`text-lg font-black ${netPaid === 0 && retAmt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatTZS(netPaid)}
                        </h3>
                        {retAmt > 0 && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatTZS(grossPaid)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onOpenReceipt(viewingTx);
                          setViewingTx(null);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Open Receipt</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

