import React, { useState, useMemo } from 'react';
import { Order, OrderItem, POSTransaction, StoreSettings, Product } from '../types';
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Printer,
  FileText,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  Building2,
  ExternalLink,
  Edit,
  Plus,
  Minus,
  Check,
  Receipt,
  ArrowUpRight,
  ArrowRight,
  Smartphone,
  AlertTriangle,
  Send,
  ShoppingCart,
  Eye,
  Trash2,
  History,
  Tag
} from 'lucide-react';
import { customConfirm } from '../utils/dialog';

export interface POSOrdersManagerProps {
  orders: Order[];
  posTransactions: POSTransaction[];
  storeSettings: StoreSettings;
  onOpenInvoice: (order: Order) => void;
  onOpenReceipt: (tx: POSTransaction) => void;
  onLoadOrderIntoPosCart: (order: Order) => void;
  onCompletePayment: (order: Order, tenderDetails: { method: string; tenderedAmount: number; changeAmount: number; notes?: string }) => Promise<void> | void;
  onUpdateOrder: (order: Order) => Promise<void> | void;
  onCancelOrder: (orderId: string, reason?: string) => Promise<void> | void;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
  onSwitchToRegister: () => void;
  onGoToSalesHistory?: () => void;
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  inputBg: string;
  modalBg?: string;
  formatTZS: (val: number) => string;
  formatToGMT3: (date: any) => string;
  activeCashierName: string;
  showAlert: (title: string, msg: string, type?: any) => void;
}

type SubMenuTab = 'all' | 'awaiting_payment' | 'partial' | 'confirmed';

export const POSOrdersManager: React.FC<POSOrdersManagerProps> = ({
  orders = [],
  posTransactions = [],
  storeSettings,
  onOpenInvoice,
  onOpenReceipt,
  onLoadOrderIntoPosCart,
  onCompletePayment,
  onUpdateOrder,
  onCancelOrder,
  onDeleteOrder,
  onSwitchToRegister,
  onGoToSalesHistory,
  isDark,
  cardBg,
  textTitle,
  textSub,
  inputBg,
  modalBg,
  formatTZS,
  formatToGMT3,
  activeCashierName,
  showAlert,
}) => {
  // Navigation & Sub-menu State
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pos' | 'web'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_desc' | 'amount_asc'>('newest');

  // Interactive Modals State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentTenderMethod, setPaymentTenderMethod] = useState<string>('Cash');
  const [paymentTenderAmount, setPaymentTenderAmount] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Preview Order Modal State
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerTin, setEditCustomerTin] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<Order['status']>('Pending');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);

  // Expanded card items toggle
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Helper date boundary functions
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const idMatch = (order.id || '').toLowerCase().includes(q);
        const nameMatch = (order.customerName || order.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (order.customerPhone || order.customer_phone || order.phone || '').toLowerCase().includes(q);
        const tinMatch = (order.customerTin || '').toLowerCase().includes(q);
        const quoMatch = (order.quotationNumber || '').toLowerCase().includes(q);
        const itemMatch = (order.items || []).some(item => (item.product?.name || '').toLowerCase().includes(q));
        if (!idMatch && !nameMatch && !phoneMatch && !tinMatch && !quoMatch && !itemMatch) {
          return false;
        }
      }

      // Source Filter
      if (sourceFilter === 'pos') {
        const isPos = order.orderSource === 'pos' || order.order_source === 'pos' || order.orderType === 'pos_pre_sale' || order.order_type === 'pos_pre_sale' || (order.shippingAddress || '').includes('In-Store');
        if (!isPos) return false;
      } else if (sourceFilter === 'web') {
        const isPos = order.orderSource === 'pos' || order.order_source === 'pos' || order.orderType === 'pos_pre_sale' || order.order_type === 'pos_pre_sale' || (order.shippingAddress || '').includes('In-Store');
        if (isPos) return false;
      }

      // Date Filter
      if (dateFilter !== 'all' && order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const orderDateStr = order.createdAt.split('T')[0];
        if (dateFilter === 'today' && orderDateStr !== todayStr) return false;
        if (dateFilter === 'yesterday' && orderDateStr !== yesterdayStr) return false;
        if (dateFilter === 'week' && orderDate < sevenDaysAgo) return false;
        if (dateFilter === 'month' && orderDate < startOfMonth) return false;
      }

      // SubMenu Tab Filter
      const pStat = (order.paymentStatus || order.payment_status || 'Pending').toLowerCase();
      const oStat = (order.status || 'Pending').toLowerCase();
      const paidAmt = Number(order.paidAmount ?? order.paid_amount ?? order.downPayment ?? order.down_payment ?? 0);
      const totalAmt = Number(order.totalAmount || order.total_amount || 0);

      // Rule: Completed orders are shifted to Sales History. Orders tab is strictly for incomplete orders!
      const isCompleted = pStat === 'paid' || oStat === 'completed' || oStat === 'delivered';
      if (isCompleted) {
        return false;
      }

      if (activeSubMenu === 'awaiting_payment') {
        return (pStat === 'pending' || pStat === 'unpaid') && oStat !== 'cancelled' && paidAmt === 0;
      }
      if (activeSubMenu === 'partial') {
        return (pStat === 'partial' || (paidAmt > 0 && paidAmt < totalAmt)) && oStat !== 'cancelled';
      }
      if (activeSubMenu === 'confirmed') {
        return (oStat === 'confirmed' || oStat === 'processing' || oStat === 'shipped') && pStat !== 'paid';
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'amount_desc') {
        return Number(b.totalAmount || b.total_amount || 0) - Number(a.totalAmount || a.total_amount || 0);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.totalAmount || a.total_amount || 0) - Number(b.totalAmount || b.total_amount || 0);
      }
      return 0;
    });
  }, [orders, searchTerm, sourceFilter, dateFilter, activeSubMenu, sortBy, todayStr, yesterdayStr, sevenDaysAgo, startOfMonth]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    let totalActive = 0;
    let awaitingPaymentTotal = 0;
    let awaitingPaymentCount = 0;
    let partialDepositTotal = 0;
    let partialCount = 0;
    let completedTotal = 0;
    let completedCount = 0;

    (orders || []).forEach(o => {
      const oStat = (o.status || 'Pending').toLowerCase();
      if (oStat === 'cancelled') return;

      const total = Number(o.totalAmount || o.total_amount || 0);
      const paid = Number(o.paidAmount ?? o.paid_amount ?? o.downPayment ?? o.down_payment ?? 0);
      const pStat = (o.paymentStatus || o.payment_status || 'Pending').toLowerCase();

      totalActive++;

      if (pStat === 'paid' || oStat === 'completed' || oStat === 'delivered') {
        completedCount++;
        completedTotal += total;
      } else if (paid > 0 && paid < total) {
        partialCount++;
        partialDepositTotal += paid;
        awaitingPaymentTotal += Math.max(0, total - paid);
      } else {
        awaitingPaymentCount++;
        awaitingPaymentTotal += total;
      }
    });

    return {
      totalActive,
      awaitingPaymentTotal,
      awaitingPaymentCount,
      partialDepositTotal,
      partialCount,
      completedTotal,
      completedCount,
    };
  }, [orders]);

  // Handle WhatsApp Share
  const handleShareWhatsApp = (order: Order) => {
    const phone = order.customerPhone || order.customer_phone || order.phone;
    if (!phone) {
      showAlert('No Phone Number', 'This order does not have a customer phone number recorded.', 'error');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const recipient = cleanPhone.startsWith('0') ? `255${cleanPhone.slice(1)}` : cleanPhone;

    const total = Number(order.totalAmount || order.total_amount || 0);
    const paid = Number(order.paidAmount ?? order.paid_amount ?? 0);
    const balance = Math.max(0, total - paid);

    const itemsSummary = (order.items || []).map(i => `• ${i.quantity}x ${i.product?.name || 'Item'} - ${formatTZS((i.price || i.product?.price || 0) * i.quantity)}`).join('\n');

    const message = `*HABARI KUTOKA ${storeSettings.storeName.toUpperCase()}*\n\n` +
      `Hati ya Malipo / Proforma Quotation: *${order.id}*\n` +
      `Mteja: *${order.customerName || 'Valued Customer'}*\n\n` +
      `*Vitu vilivyochaguliwa:*\n${itemsSummary}\n\n` +
      `*Jumla Kuu:* ${formatTZS(total)}\n` +
      (paid > 0 ? `*Kiasi Kilicholipwa:* ${formatTZS(paid)}\n*Baki Inayodaiwa:* ${formatTZS(balance)}\n` : '') +
      `\n*Akaunti za Malipo:*\n` +
      `• CRDB Bank: 0150 8829 4100 (${storeSettings.storeName})\n` +
      `• M-Pesa Lipa Namba: 5543210 (${storeSettings.storeName})\n\n` +
      `Tafadhali tuma picha ya muamala au thibitisha malipo kupitia namba hii: ${storeSettings.phone}`;

    const url = `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Open Payment Modal for an order
  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    const total = Number(order.totalAmount || order.total_amount || 0);
    const paid = Number(order.paidAmount ?? order.paid_amount ?? order.downPayment ?? order.down_payment ?? 0);
    const balance = Math.max(0, total - paid);
    setPaymentTenderAmount(balance.toString());
    setPaymentTenderMethod('Cash');
    setPaymentReference('');
    setPaymentNotes('');
  };

  // Execute complete payment
  const handleExecutePayment = async () => {
    if (!selectedOrderForPayment) return;
    const total = Number(selectedOrderForPayment.totalAmount || selectedOrderForPayment.total_amount || 0);
    const paidSoFar = Number(selectedOrderForPayment.paidAmount ?? selectedOrderForPayment.paid_amount ?? 0);
    const balance = Math.max(0, total - paidSoFar);

    const tenderedNum = Number(paymentTenderAmount);
    if (isNaN(tenderedNum) || tenderedNum <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid payment tender amount.', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const changeAmount = paymentTenderMethod === 'Cash' && tenderedNum > balance ? tenderedNum - balance : 0;
      await onCompletePayment(selectedOrderForPayment, {
        method: paymentReference ? `${paymentTenderMethod} (${paymentReference})` : paymentTenderMethod,
        tenderedAmount: tenderedNum,
        changeAmount,
        notes: paymentNotes
      });
      const orderId = selectedOrderForPayment.id;
      setSelectedOrderForPayment(null);
      if (previewOrder?.id === orderId) setPreviewOrder(null);
      showAlert('Order Completed & Shifted to Sales History', `Payment recorded! Order #${orderId} has been completed, receipt generated, and shifted to Sales History.`, 'success');
    } catch (err: any) {
      console.error('Error completing payment:', err);
      showAlert('Payment Failed', err.message || 'Failed to complete payment.', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Edit Order Modal
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName || order.customer_name || '');
    setEditCustomerPhone(order.customerPhone || order.customer_phone || order.phone || '');
    setEditCustomerEmail(order.customerEmail || order.customer_email || '');
    setEditCustomerTin(order.customerTin || '');
    setEditShippingAddress(order.shippingAddress || order.shipping_address || '');
    setEditNotes(order.notes || '');
    setEditStatus(order.status || 'Pending');
    setEditItems(JSON.parse(JSON.stringify(order.items || [])));
    setEditDiscount(Number(order.discount || 0));
  };

  // Helper functions for editing items within order
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setEditItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  const handleRemoveItemFromEdit = (index: number) => {
    if (editItems.length <= 1) {
      showAlert('Cannot Remove Item', 'An order must contain at least one item. To delete the entire order, please use "Delete Order".', 'warning');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save Order Edits
  const handleSaveOrderEdits = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      showAlert('Empty Order', 'An order must contain at least one item.', 'error');
      return;
    }

    const calculatedSubtotal = editItems.reduce((acc, item) => {
      const itemPrice = item.price || item.product?.price || 0;
      return acc + (itemPrice * item.quantity);
    }, 0);

    const validDiscount = Math.min(calculatedSubtotal, Math.max(0, Number(editDiscount) || 0));
    const finalSubtotal = Math.max(0, calculatedSubtotal - validDiscount);
    const calculatedTax = editingOrder.includeVat ? Math.round(finalSubtotal * 0.18 / 1.18) : 0;
    const finalTotal = finalSubtotal;
    const currentPaid = Number(editingOrder.paidAmount ?? 0);
    const newBalance = Math.max(0, finalTotal - currentPaid);

    const updated: Order = {
      ...editingOrder,
      customerName: editCustomerName.trim() || 'Valued Customer',
      customer_name: editCustomerName.trim() || 'Valued Customer',
      customerPhone: editCustomerPhone.trim(),
      customer_phone: editCustomerPhone.trim(),
      phone: editCustomerPhone.trim(),
      customerEmail: editCustomerEmail.trim(),
      customer_email: editCustomerEmail.trim(),
      customerTin: editCustomerTin.trim(),
      shippingAddress: editShippingAddress.trim() || 'In-Store POS',
      shipping_address: editShippingAddress.trim() || 'In-Store POS',
      notes: editNotes.trim(),
      status: editStatus,
      items: editItems,
      discount: validDiscount,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      totalAmount: finalTotal,
      total_amount: finalTotal,
      outstandingBalance: newBalance,
      updatedAt: new Date().toISOString()
    };

    await onUpdateOrder(updated);
    setEditingOrder(null);
    if (previewOrder?.id === updated.id) {
      setPreviewOrder(updated);
    }
    showAlert('Order Updated', `Order ${updated.id} details and items updated successfully.`, 'success');
  };

  // Delete order permanently with confirmation
  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = await customConfirm(
      `Are you sure you want to permanently delete order ${orderId}? This cannot be undone.`,
      'Delete Order',
      'warning',
      'Yes, Delete Order'
    );
    if (confirmed) {
      try {
        if (onDeleteOrder) {
          await onDeleteOrder(orderId);
        }
        if (previewOrder?.id === orderId) setPreviewOrder(null);
        if (editingOrder?.id === orderId) setEditingOrder(null);
        showAlert('Order Deleted', `Order ${orderId} has been permanently deleted.`, 'alert');
      } catch (err: any) {
        console.error('Error deleting order:', err);
        showAlert('Delete Failed', err.message || 'Failed to delete order.', 'error');
      }
    }
  };

  // Cancel order with confirmation
  const handleCancelClick = async (orderId: string) => {
    const confirmed = await customConfirm(
      `Are you sure you want to void / cancel order ${orderId}? This will mark the quotation as cancelled.`,
      'Cancel Pre-Sale Order',
      'warning',
      'Yes, Cancel Order'
    );
    if (confirmed) {
      await onCancelOrder(orderId, 'Cancelled by counter seller');
      showAlert('Order Cancelled', `Order ${orderId} has been marked as cancelled.`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black tracking-tight ${textTitle}`}>POS Pre-Sale Orders & Quotations</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                Awaiting Payment / Pickup
              </span>
            </div>
            <p className={`text-xs ${textSub}`}>Manage pre-sale orders, quotations waiting for customer payment or confirmation, and convert to completed sales.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch to Live Register Button */}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open POS Register</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className={`p-3.5 rounded-2xl border ${cardBg} transition-all`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold ${textSub}`}>Active Pre-Sales</span>
            <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-lg font-black mt-1 ${textTitle}`}>{metrics.totalActive}</p>
          <span className="text-[10px] text-blue-500 font-semibold">Orders in register book</span>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg} transition-all`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold ${textSub}`}>Awaiting Payment</span>
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black mt-1 text-amber-500">{formatTZS(metrics.awaitingPaymentTotal)}</p>
          <span className="text-[10px] text-amber-600/80 font-semibold">{metrics.awaitingPaymentCount} quotes pending payment</span>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg} transition-all`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold ${textSub}`}>Deposits Collected</span>
            <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black mt-1 text-purple-500">{formatTZS(metrics.partialDepositTotal)}</p>
          <span className="text-[10px] text-purple-600/80 font-semibold">{metrics.partialCount} partial advances</span>
        </div>

        <div
          onClick={onGoToSalesHistory}
          className={`p-3.5 rounded-2xl border ${cardBg} transition-all ${onGoToSalesHistory ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5' : ''}`}
          title="Click to view all completed orders in Sales History"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold ${textSub}`}>Shifted to Sales History</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {onGoToSalesHistory && <ArrowRight className="w-3 h-3" />}
            </div>
          </div>
          <p className="text-lg font-black mt-1 text-emerald-500">{formatTZS(metrics.completedTotal)}</p>
          <span className="text-[10px] text-emerald-600/80 font-semibold">{metrics.completedCount} finalized sales (Click to view ➔)</span>
        </div>
      </div>

      {/* Sub-menu Tabs Strip - Incomplete Orders Only */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubMenu('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubMenu === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Incomplete Orders</span>
          <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full ${activeSubMenu === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {metrics.totalActive}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('awaiting_payment')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubMenu === 'awaiting_payment'
              ? 'bg-amber-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Awaiting Payment</span>
          {metrics.awaitingPaymentCount > 0 && (
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full ${activeSubMenu === 'awaiting_payment' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-500'}`}>
              {metrics.awaitingPaymentCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('partial')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubMenu === 'partial'
              ? 'bg-purple-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Deposits & Partials</span>
          {metrics.partialCount > 0 && (
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full ${activeSubMenu === 'partial' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-400'}`}>
              {metrics.partialCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('confirmed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubMenu === 'confirmed'
              ? 'bg-indigo-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Confirmed / Ready</span>
        </button>

        {/* Shifted to Sales History Action Button */}
        {onGoToSalesHistory && (
          <button
            type="button"
            onClick={onGoToSalesHistory}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ml-auto bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs group"
            title="Go to Sales History to view all completed sales and print thermal receipts"
          >
            <History className="w-3.5 h-3.5 text-blue-500 group-hover:text-white transition-colors" />
            <span>Go to Sales History</span>
            {metrics.completedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black group-hover:bg-white/20 group-hover:text-white">
                {metrics.completedCount} Completed
              </span>
            )}
            <ArrowRight className="w-3 h-3 ml-0.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Filter and Search Bar Controls */}
      <div className={`p-3 rounded-2xl border ${cardBg} flex flex-col md:flex-row items-center gap-2.5`}>
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer name, phone, TIN or item..."
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <div className="flex items-center rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${dateFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${dateFilter === 'today' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${dateFilter === 'week' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
            >
              7 Days
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${inputBg}`}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${cardBg} space-y-3`}>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${textTitle}`}>No Pre-Sale Orders Found</h3>
          <p className={`text-xs max-w-sm mx-auto ${textSub}`}>
            {searchTerm
              ? `No orders matching "${searchTerm}". Try resetting your search filters.`
              : 'There are currently no pre-sale orders or quotations in this view. You can create one from the POS Register cart.'}
          </p>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Pre-Sale Order in Register</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const total = Number(order.totalAmount || order.total_amount || 0);
            const paid = Number(order.paidAmount ?? order.paid_amount ?? order.downPayment ?? order.down_payment ?? 0);
            const balance = Math.max(0, total - paid);
            const isFullyPaid = (order.paymentStatus || order.payment_status) === 'Paid' || balance === 0;
            const isPartial = paid > 0 && paid < total;
            const isExpanded = !!expandedOrderIds[order.id];
            const isPosOrder = order.orderSource === 'pos' || order.order_source === 'pos' || order.orderType === 'pos_pre_sale';

            return (
              <div
                key={order.id}
                className={`p-4 rounded-2xl border transition-all ${cardBg} hover:border-blue-500/40`}
              >
                {/* Order Top Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      {order.id}
                    </span>
                    {order.quotationNumber && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Quote #{order.quotationNumber}
                      </span>
                    )}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isPosOrder ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {isPosOrder ? 'Counter Pre-Sale' : 'Online Storefront'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatToGMT3(order.createdAt)}
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Payment Status */}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isFullyPaid
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : isPartial
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {isFullyPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isFullyPaid ? 'Paid' : isPartial ? 'Partial Paid' : 'Awaiting Payment'}
                    </span>

                    {/* Order Fulfillment Status */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      (order.status || 'Pending').toLowerCase() === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : (order.status || 'Pending').toLowerCase() === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {order.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Main Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 py-3 text-xs">
                  {/* Customer Information */}
                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${textSub}`}>Customer Details</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customerName || order.customer_name || 'Valued Customer'}</span>
                    </div>
                    {(order.customerPhone || order.customer_phone || order.phone) && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.customerPhone || order.customer_phone || order.phone}</span>
                      </div>
                    )}
                    {order.customerTin && (
                      <div className="text-[11px] text-slate-400">
                        TIN: <span className="font-mono font-bold text-slate-300">{order.customerTin}</span>
                      </div>
                    )}
                    {order.shippingAddress && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        Delivery: {order.shippingAddress}
                      </div>
                    )}
                  </div>

                  {/* Financial & Payment Method */}
                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${textSub}`}>Payment & Pricing</span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total Quotation:</span>
                      <span className={`font-extrabold ${textTitle}`}>{formatTZS(total)}</span>
                    </div>
                    {paid > 0 && (
                      <div className="flex items-center justify-between text-xs text-purple-500">
                        <span>Paid Advance / Deposit:</span>
                        <span className="font-bold">{formatTZS(paid)}</span>
                      </div>
                    )}
                    {!isFullyPaid && (
                      <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                        <span>Outstanding Balance:</span>
                        <span>{formatTZS(balance)}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">
                      Tender Target: <span className="font-semibold text-slate-300">{order.paymentMethod || 'Commercial Payment'}</span>
                    </div>
                  </div>

                  {/* Internal Notes / Cashier Staff */}
                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${textSub}`}>Order Audit & Notes</span>
                    <div className="text-[11px] text-slate-400">
                      Cashier: <span className="font-semibold text-slate-200">{order.cashierName || activeCashierName}</span>
                    </div>
                    {order.notes ? (
                      <p className="text-[11px] italic text-slate-500 line-clamp-2">
                        "{order.notes}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">No specific order notes.</p>
                    )}
                    {order.includeVat && (
                      <span className="inline-block text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400">
                        VAT (18% Included)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Preview Strip / Expandable */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-all"
                    >
                      <span>{(order.items || []).length} items in quotation</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Preview Order Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewOrder(order)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Preview Order Details & Financials"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {/* Edit Order Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(order)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Edit items, customer information, discount, or notes"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Order Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title="Permanently Delete Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      {/* Print / View Proforma Invoice A4 */}
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(order)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-all active:scale-95"
                        title="View or Print Proforma / Tax Invoice (A4)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Invoice (A4)</span>
                      </button>

                      {/* WhatsApp Share Quote */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(order)}
                        className="p-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 transition-all active:scale-95"
                        title="Send Quotation to WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Complete Payment Button */}
                      {!isFullyPaid && (order.status || '').toLowerCase() !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(order)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ml-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Complete Payment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-12 text-[10px] font-black uppercase text-slate-400 pb-1">
                        <div className="col-span-6">Item Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>
                      {(order.items || []).map((item, idx) => {
                        const unitPrice = item.price || item.product?.price || 0;
                        const itemTotal = unitPrice * item.quantity;
                        return (
                          <div key={idx} className="grid grid-cols-12 items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800/40">
                            <div className="col-span-6 flex items-center gap-2">
                              {item.product?.image && (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="truncate">
                                <span className={`font-bold ${textTitle}`}>{item.product?.name || 'Product Item'}</span>
                                {item.product?.brand && (
                                  <span className="text-[10px] text-slate-400 ml-1.5">({item.product.brand})</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                            <div className="col-span-2 text-right text-slate-500">{formatTZS(unitPrice)}</div>
                            <div className="col-span-2 text-right font-extrabold text-blue-500">{formatTZS(itemTotal)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Payment Tender Modal */}
      {selectedOrderForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className={`max-w-md w-full rounded-2xl border p-5 space-y-4 shadow-2xl ${modalBg || cardBg}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-base ${textTitle}`}>Complete Pre-Sale Payment</h3>
                  <p className={`text-[11px] ${textSub}`}>Order #{selectedOrderForPayment.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForPayment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold">{selectedOrderForPayment.customerName || 'Valued Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Order Amount:</span>
                <span className="font-bold">{formatTZS(Number(selectedOrderForPayment.totalAmount || 0))}</span>
              </div>
              <div className="flex justify-between text-amber-500 font-extrabold">
                <span>Balance to Settle:</span>
                <span>{formatTZS(Math.max(0, Number(selectedOrderForPayment.totalAmount || 0) - Number(selectedOrderForPayment.paidAmount || 0)))}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400">Payment Tender Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Cash',
                  'M-Pesa / Vodacom',
                  'Airtel Money',
                  'Mixx by Yas (Tigo)',
                  'Bank Transfer (CRDB/NMB)',
                  'Card / POS Terminal'
                ].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentTenderMethod(method)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left truncate ${
                      paymentTenderMethod === method
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Tender Amount Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400">Tendered / Received Amount (TZS)</label>
              <input
                type="number"
                value={paymentTenderAmount}
                onChange={(e) => setPaymentTenderAmount(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm font-extrabold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                placeholder="Enter tendered amount"
              />
              {paymentTenderMethod === 'Cash' && Number(paymentTenderAmount) > Math.max(0, Number(selectedOrderForPayment.totalAmount || 0) - Number(selectedOrderForPayment.paidAmount || 0)) && (
                <div className="flex justify-between text-xs text-blue-500 font-bold pt-1">
                  <span>Change Due:</span>
                  <span>{formatTZS(Number(paymentTenderAmount) - Math.max(0, Number(selectedOrderForPayment.totalAmount || 0) - Number(selectedOrderForPayment.paidAmount || 0)))}</span>
                </div>
              )}
            </div>

            {/* Reference (Mobile Money / Bank Slip) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400">Transaction Reference / Receipt Code (Optional)</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBg}`}
                placeholder="e.g. MP9283719, CRDB wire ref"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOrderForPayment(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPayment || Number(paymentTenderAmount) <= 0}
                onClick={handleExecutePayment}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isSubmittingPayment ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Issue Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Order Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className={`max-w-2xl w-full rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col ${modalBg || cardBg}`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-base sm:text-lg ${textTitle}`}>Order Preview: #{previewOrder.id}</h3>
                    {previewOrder.quotationNumber && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {previewOrder.quotationNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Created: {formatToGMT3(previewOrder.createdAt)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Status and Customer Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Customer Details</span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">{previewOrder.customerName || previewOrder.customer_name || 'Valued Customer'}</p>
                  {(previewOrder.customerPhone || previewOrder.customer_phone || previewOrder.phone) && (
                    <p className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{previewOrder.customerPhone || previewOrder.customer_phone || previewOrder.phone}</span>
                    </p>
                  )}
                  {previewOrder.customerEmail && (
                    <p className="text-slate-400">{previewOrder.customerEmail}</p>
                  )}
                  {previewOrder.customerTin && (
                    <p className="text-slate-400">
                      TIN: <span className="font-mono font-bold text-slate-300">{previewOrder.customerTin}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status & Delivery</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      (previewOrder.paymentStatus || '').toLowerCase() === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : (previewOrder.paymentStatus || '').toLowerCase() === 'partial'
                        ? 'bg-purple-500/15 text-purple-400'
                        : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      Payment: {previewOrder.paymentStatus || 'Awaiting Payment'}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                      Order: {previewOrder.status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-slate-400">Destination: {previewOrder.shippingAddress || 'In-Store POS'}</p>
                  <p className="text-slate-400">Cashier: {previewOrder.cashierName || activeCashierName}</p>
                  {previewOrder.notes && (
                    <p className="text-slate-500 italic mt-1 bg-white/5 p-1.5 rounded">"{previewOrder.notes}"</p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">Ordered Products ({(previewOrder.items || []).length})</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800/80 p-2 text-[10px] font-black uppercase text-slate-400">
                    <div className="col-span-6">Product</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  {(previewOrder.items || []).map((item, idx) => {
                    const price = item.price || item.product?.price || 0;
                    const lineTotal = price * item.quantity;
                    return (
                      <div key={idx} className="grid grid-cols-12 items-center p-2.5 text-xs">
                        <div className="col-span-6 flex items-center gap-2">
                          {item.product?.image && (
                            <img
                              src={item.product.image}
                              alt=""
                              className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="truncate">
                            <p className="font-bold truncate text-slate-800 dark:text-slate-100">{item.product?.name || 'Item'}</p>
                            {item.product?.sku && <span className="text-[10px] text-slate-400">SKU: {item.product.sku}</span>}
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                        <div className="col-span-2 text-right font-medium text-slate-400">{formatTZS(price)}</div>
                        <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white">{formatTZS(lineTotal)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatTZS(Number(previewOrder.subtotal || previewOrder.totalAmount || 0))}</span>
                </div>
                {Number(previewOrder.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount Applied:</span>
                    <span className="font-bold">-{formatTZS(Number(previewOrder.discount))}</span>
                  </div>
                )}
                {previewOrder.includeVat && (
                  <div className="flex justify-between text-blue-400 text-[11px]">
                    <span>VAT (18% Included):</span>
                    <span>{formatTZS(Number(previewOrder.tax || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Quotation:</span>
                  <span className="text-blue-500">{formatTZS(Number(previewOrder.totalAmount || 0))}</span>
                </div>
                {Number(previewOrder.paidAmount || 0) > 0 && (
                  <div className="flex justify-between text-purple-400 font-bold">
                    <span>Paid So Far / Deposit:</span>
                    <span>{formatTZS(Number(previewOrder.paidAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-amber-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Outstanding Balance:</span>
                  <span>{formatTZS(Math.max(0, Number(previewOrder.totalAmount || 0) - Number(previewOrder.paidAmount || 0)))}</span>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(previewOrder.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ord = previewOrder;
                    setPreviewOrder(null);
                    handleOpenEditModal(ord);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Order</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenInvoice(previewOrder)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Invoice (A4)</span>
                </button>
                {Math.max(0, Number(previewOrder.totalAmount || 0) - Number(previewOrder.paidAmount || 0)) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = previewOrder;
                      setPreviewOrder(null);
                      handleOpenPaymentModal(ord);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Complete Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal with Items Editor */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className={`max-w-xl w-full rounded-2xl border p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col ${modalBg || cardBg}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                <h3 className={`font-extrabold text-base ${textTitle}`}>Edit Order #{editingOrder.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Customer Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={editCustomerEmail}
                    onChange={(e) => setEditCustomerEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Customer TIN (Optional)</label>
                  <input
                    type="text"
                    value={editCustomerTin}
                    onChange={(e) => setEditCustomerTin(e.target.value)}
                    placeholder="e.g. 102-334-556"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Shipping / Delivery Address</label>
                  <input
                    type="text"
                    value={editShippingAddress}
                    onChange={(e) => setEditShippingAddress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Order Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped / In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Items List & Quantity Adjuster */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-bold">Quotation Items & Quantities</label>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadOrderIntoPosCart(editingOrder);
                      setEditingOrder(null);
                    }}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>Open in Full Register Cart</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                  {editItems.map((item, idx) => {
                    const price = item.price || item.product?.price || 0;
                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-slate-800 dark:text-slate-200">{item.product?.name || 'Product Item'}</p>
                          <p className="text-[11px] text-slate-400">{formatTZS(price)} each</p>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, Math.max(1, item.quantity - 1))}
                            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3 text-slate-400" />
                          </button>
                          <span className="w-7 text-center font-extrabold text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="w-24 text-right font-black text-slate-900 dark:text-white">
                          {formatTZS(price * item.quantity)}
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromEdit(idx)}
                          className="p-1 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount Input & Live Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Discount (TZS)</label>
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className={`w-full pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Staff Notes</label>
                  <textarea
                    rows={1}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                  />
                </div>
              </div>

              {/* Dynamic Financial Recalculation Display */}
              {(() => {
                const sub = editItems.reduce((acc, it) => acc + ((it.price || it.product?.price || 0) * it.quantity), 0);
                const disc = Math.min(sub, Math.max(0, Number(editDiscount) || 0));
                const tot = Math.max(0, sub - disc);
                const paid = Number(editingOrder.paidAmount || 0);
                const bal = Math.max(0, tot - paid);
                return (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Calculated Subtotal:</span>
                      <span className="font-semibold">{formatTZS(sub)}</span>
                    </div>
                    {disc > 0 && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Discount:</span>
                        <span className="font-bold">-{formatTZS(disc)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>New Total:</span>
                      <span className="text-blue-500">{formatTZS(tot)}</span>
                    </div>
                    <div className="flex justify-between text-amber-500 font-bold">
                      <span>New Outstanding Balance:</span>
                      <span>{formatTZS(bal)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrderEdits}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
