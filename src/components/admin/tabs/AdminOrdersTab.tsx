import React, { useState, useMemo } from "react";
import { Order, POSTransaction, StoreSettings } from "../../../types";
import { exportSalesToCSV } from "../../../utils/exportData";
import { customAlert, customConfirm } from '../../../utils/dialog';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Truck,
  AlertTriangle,
  Clock,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
  Check,
  ChevronDown,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Store,
  Zap
} from "lucide-react";

export interface AdminOrdersTabProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void> | void;
  deleteOrder?: (orderId: string) => Promise<void> | void;
  updateOrder?: (order: Order) => Promise<void> | void;
  clearOrders?: () => Promise<void> | void;
  onOpenInvoice?: (order: Order) => void;
  onOpenReceipt?: (tx: any) => void;
  onTransferToPos?: (order: Order, options?: { openInRegister?: boolean }) => Promise<void> | void;
  onBulkTransferToPos?: (orders: Order[]) => Promise<void> | void;
  onOpenInPos?: (order: Order) => void;
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  modalBg?: string;
  tableHeaderBg: string;
  tableRowHover: string;
  formatTZS: (val: number) => string;
  formatToGMT3?: (date: any) => string;
  showAlert: (title: string, msg: string, type?: any) => void;
  ensureOnline: (actionName?: string) => boolean;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders = [],
  updateOrderStatus,
  deleteOrder,
  updateOrder,
  clearOrders,
  onOpenInvoice,
  onOpenReceipt,
  onTransferToPos,
  onBulkTransferToPos,
  onOpenInPos,
  isDark,
  cardBg,
  textTitle,
  textSub,
  modalBg = isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900",
  tableHeaderBg,
  tableRowHover,
  formatTZS,
  formatToGMT3 = (d) => String(d || ""),
  showAlert,
  ensureOnline
}) => {
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<Order["status"]>("Processing");
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState("");
  const [dispatchCourier, setDispatchCourier] = useState("DAR Express (Local)");
  const [dispatchEstimatedDelivery, setDispatchEstimatedDelivery] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchPaidAmount, setDispatchPaidAmount] = useState<number>(0);
  const [dispatchPaymentStatus, setDispatchPaymentStatus] = useState<"Pending" | "Partial" | "Paid" | "Failed">("Pending");

  // Aliases for callback names in existing JSX
  const setSelectedOrderForInvoice = onOpenInvoice || (() => {});
  const setLastReceipt = onOpenReceipt || (() => {});

  return (
    <>
      <div className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div>

                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Online Customer Orders</h1>

                <p className={`text-sm mt-1 ${textSub}`}>Fulfill online marketplace orders, assign couriers, manage tracking numbers, and sync live to customers.</p>

              </div>

              <div className="flex items-center gap-2 flex-wrap">

                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>

                  {orders.length} Total Orders

                </span>

                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length} Active Processing
                </span>

                <button
                  type="button"
                  onClick={() => setOrderStatusFilter(prev => prev === 'transferred-to-pos' ? 'All' : 'transferred-to-pos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    orderStatusFilter === 'transferred-to-pos'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDark ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300 hover:bg-indigo-900/50' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="Quick filter: View orders transferred to Offline POS"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>
                    {orders.filter(o => Boolean(o.status === 'transferred-to-pos' || o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos')).length} Transferred to POS
                  </span>
                </button>

                {selectedOrderIds.length > 0 && (onBulkTransferToPos || onTransferToPos) && (() => {
                  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
                  const eligible = selectedOrders.filter(o => {
                    const st = (o.status || '').toLowerCase();
                    const pStat = (o.paymentStatus || o.payment_status || 'Pending').toLowerCase();
                    const isPendingOrTransferred =
                      st === 'pending' ||
                      st === 'transferred-to-pos' ||
                      Boolean(o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos');
                    return isPendingOrTransferred && pStat !== 'paid' && st !== 'cancelled' && st !== 'completed';
                  });
                  return (
                    <button
                      type="button"
                      onClick={async () => {
                        if (eligible.length === 0) {
                          showAlert(
                            'No Eligible Orders',
                            "Select one or more unpaid 'Pending' or 'transferred-to-pos' online orders to transfer to Offline POS.",
                            'warning'
                          );
                          return;
                        }
                        if (
                          eligible.length === 1 ||
                          (await customConfirm(
                            `Transfer ${eligible.length} selected online order(s) to Offline POS in a single operation and mark them as 'transferred-to-pos'?`,
                            'Bulk Transfer to POS'
                          ))
                        ) {
                          if (onBulkTransferToPos) {
                            await onBulkTransferToPos(eligible);
                          } else if (onTransferToPos) {
                            for (let i = 0; i < eligible.length; i++) {
                              await onTransferToPos(eligible[i], { openInRegister: i === 0 });
                            }
                          }
                          setSelectedOrderIds([]);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Transfer Selected to POS ({eligible.length})</span>
                    </button>
                  );
                })()}

                {selectedOrderIds.length > 0 && deleteOrder && (

                  <button

                    onClick={async () => {

                      if (await customConfirm(`Delete ${selectedOrderIds.length} selected orders?`, 'Delete Orders')) {
                          for (const id of selectedOrderIds) {
                            await deleteOrder(id);
                          }
                          setSelectedOrderIds([]);
                      }

                    }}

                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"

                  >

                    <Trash2 className="w-3.5 h-3.5" />

                    <span>Delete Selected ({selectedOrderIds.length})</span>

                  </button>

                )}

                {orders.length > 0 && clearOrders && (

                  <button

                    onClick={async () => {

                      if (await customConfirm('Are you sure you want to clear ALL online orders?', 'Clear Orders')) {
                        await clearOrders();
                        setSelectedOrderIds([]);
                      }

                    }}

                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"

                  >

                    <Trash2 className="w-3.5 h-3.5" />

                    <span>Clear All Orders</span>

                  </button>

                )}

              </div>

            </div>

            {/* Search, Filter Chips & Status Dropdown */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search orders by ID, customer name, phone, or email..."
                    className={`w-full pl-10 pr-8 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="transferred-to-pos">Transferred to POS (transferred-to-pos)</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Quick Filter Chips */}
              {(() => {
                const isOrderTransferredToPos = (o: Order) =>
                  Boolean(
                    o.status === 'transferred-to-pos' ||
                    o.transferredToPos ||
                    o.transferred_to_pos ||
                    o.orderType === 'online_to_pos' ||
                    o.order_type === 'online_to_pos'
                  );
                const transferredCount = orders.filter(isOrderTransferredToPos).length;
                const chips: { value: string; label: string; count?: number; isPosChip?: boolean }[] = [
                  { value: 'All', label: 'All Orders', count: orders.length },
                  { value: 'transferred-to-pos', label: 'Transferred to POS', count: transferredCount, isPosChip: true },
                  { value: 'Pending', label: 'Pending', count: orders.filter(o => o.status === 'Pending').length },
                  { value: 'Processing', label: 'Processing', count: orders.filter(o => o.status === 'Processing').length },
                  { value: 'Shipped', label: 'Shipped', count: orders.filter(o => o.status === 'Shipped').length },
                  { value: 'Delivered', label: 'Delivered', count: orders.filter(o => o.status === 'Delivered').length },
                  { value: 'Completed', label: 'Completed', count: orders.filter(o => o.status === 'Completed').length },
                ];

                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    {chips.map((chip) => {
                      const active = orderStatusFilter === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => setOrderStatusFilter(active && chip.value !== 'All' ? 'All' : chip.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? chip.isPosChip
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : chip.isPosChip
                              ? isDark
                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/50'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              : isDark
                              ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {chip.isPosChip && <Store className="w-3.5 h-3.5" />}
                          <span>{chip.label}</span>
                          {chip.count !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              active
                                ? 'bg-white/20 text-white'
                                : chip.isPosChip
                                ? 'bg-indigo-500/15 text-indigo-500'
                                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {chip.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const q = orderSearchQuery.trim().toLowerCase();
              const filteredAdminOrders = orders.filter((o) => {
                const isTransferred = Boolean(
                  o.status === 'transferred-to-pos' ||
                  o.transferredToPos ||
                  o.transferred_to_pos ||
                  o.orderType === 'online_to_pos' ||
                  o.order_type === 'online_to_pos'
                );
                const matchesStatus =
                  orderStatusFilter === 'All' ||
                  (orderStatusFilter === 'transferred-to-pos' ? isTransferred : o.status === orderStatusFilter);
                if (!matchesStatus) return false;
                if (!q) return true;
                return (
                  String(o.id || '').toLowerCase().includes(q) ||
                  String(o.customerName || o.customer_name || '').toLowerCase().includes(q) ||
                  String(o.customerEmail || o.customer_email || '').toLowerCase().includes(q) ||
                  String(o.customerPhone || o.customer_phone || o.phone || '').toLowerCase().includes(q)
                );
              });
              const eligibleBulkTransferIds = filteredAdminOrders
                .filter((o) => {
                  const st = (o.status || '').toLowerCase();
                  const pStat = (o.paymentStatus || o.payment_status || 'Pending').toLowerCase();
                  const isPendingOrTransferred =
                    st === 'pending' ||
                    st === 'transferred-to-pos' ||
                    Boolean(o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos');
                  return isPendingOrTransferred && pStat !== 'paid' && st !== 'cancelled' && st !== 'completed';
                })
                .map((o) => o.id);

              const selectedEligibleOrders = orders.filter((o) => {
                if (!selectedOrderIds.includes(o.id)) return false;
                const st = (o.status || '').toLowerCase();
                const pStat = (o.paymentStatus || o.payment_status || 'Pending').toLowerCase();
                const isPendingOrTransferred =
                  st === 'pending' ||
                  st === 'transferred-to-pos' ||
                  Boolean(o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos');
                return isPendingOrTransferred && pStat !== 'paid' && st !== 'cancelled' && st !== 'completed';
              });

              return (
            <div className="space-y-3">
              {/* Bulk Selection Toolbar */}
              <div className={`px-4 py-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                selectedOrderIds.length > 0
                  ? isDark ? 'bg-indigo-950/35 border-indigo-700/60' : 'bg-indigo-50/80 border-indigo-200'
                  : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className={`font-bold ${textTitle}`}>
                    {selectedOrderIds.length > 0
                      ? `${selectedOrderIds.length} order(s) selected (${selectedEligibleOrders.length} eligible for POS transfer)`
                      : `Bulk Transfer: Select 'Pending' or 'transferred-to-pos' orders (${eligibleBulkTransferIds.length} available)`}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {eligibleBulkTransferIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds(eligibleBulkTransferIds)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-indigo-300 hover:bg-slate-700' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      Select Pending / Transferred ({eligibleBulkTransferIds.length})
                    </button>
                  )}
                  {selectedOrderIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds([])}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Clear Selection
                    </button>
                  )}
                  {selectedOrderIds.length > 0 && (onBulkTransferToPos || onTransferToPos) && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedEligibleOrders.length === 0) {
                          showAlert(
                            'No Eligible Orders',
                            "Only unpaid 'Pending' or 'transferred-to-pos' orders can be transferred to Offline POS.",
                            'warning'
                          );
                          return;
                        }
                        if (
                          selectedEligibleOrders.length === 1 ||
                          (await customConfirm(
                            `Transfer ${selectedEligibleOrders.length} selected online order(s) to Offline POS in a single operation?`,
                            'Bulk Transfer to POS'
                          ))
                        ) {
                          if (onBulkTransferToPos) {
                            await onBulkTransferToPos(selectedEligibleOrders);
                          } else if (onTransferToPos) {
                            for (let i = 0; i < selectedEligibleOrders.length; i++) {
                              await onTransferToPos(selectedEligibleOrders[i], { openInRegister: i === 0 });
                            }
                          }
                          setSelectedOrderIds([]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Bulk Transfer to POS ({selectedEligibleOrders.length})</span>
                    </button>
                  )}
                </div>
              </div>

            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

              <div className="overflow-x-auto w-full">

                <table className="w-full text-left text-xs min-w-[900px]">

                  <thead>

                    <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                      <th className="p-4 w-10 text-center">

                        <input

                          type="checkbox"

                          aria-label="Select all visible orders"

                          onChange={(e) => setSelectedOrderIds(e.target.checked ? filteredAdminOrders.map(o => o.id) : [])}

                          checked={filteredAdminOrders.length > 0 && filteredAdminOrders.every(o => selectedOrderIds.includes(o.id))}

                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"

                        />

                      </th>

                      <th className="p-4">Order ID & Date</th>

                      <th className="p-4">Customer & Contact</th>

                      <th className="p-4">Shipping Destination</th>

                      <th className="p-4">Items & Total</th>

                      <th className="p-4">Tracking & Courier</th>

                      <th className="p-4">Fulfillment Status</th>

                      <th className="p-4">Payment Status</th>

                      <th className="p-4 text-right">Actions & Dispatch</th>

                    </tr>

                  </thead>

                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                    {filteredAdminOrders.map((o) => {
                      const isRowSelected = selectedOrderIds.includes(o.id);
                      return (
                      <tr key={o.id} className={`transition-colors ${isRowSelected ? (isDark ? 'bg-indigo-950/25' : 'bg-indigo-50/60') : tableRowHover}`}>

                        <td className="p-4 w-10 text-center">

                          <input

                            type="checkbox"

                            aria-label={`Select order ${o.id}`}

                            checked={isRowSelected}

                            onChange={(e) => setSelectedOrderIds(e.target.checked ? [...selectedOrderIds, o.id] : selectedOrderIds.filter(id => id !== o.id))}

                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"

                          />

                        </td>

                        <td className="p-4">

                          <div className={`font-bold ${textTitle}`}>{o.id}</div>

                          <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{formatToGMT3(o.createdAt)}</div>

                          {(o.status === 'transferred-to-pos' || o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos') && (
                            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              <Store className="w-3 h-3" />
                              <span>transferred-to-pos</span>
                            </span>
                          )}

                          {(o.autoCompletedViaOrbiPay || o.auto_completed_via_orbi_pay) && (
                            <span className="mt-1 ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              <Zap className="w-3 h-3" />
                              <span>Orbi Auto-Paid</span>
                            </span>
                          )}

                        </td>

                        <td className="p-4">

                          <div className={`font-semibold ${textTitle}`}>{o.customerName}</div>

                          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{o.customerEmail}</div>

                          {(o.customerPhone || o.phone) && (

                            <div className="text-[11px] font-bold text-blue-500">{o.customerPhone || o.phone}</div>

                          )}

                        </td>

                        <td className={`p-4 max-w-xs ${textSub}`}>

                          <div className="truncate font-medium">{o.shippingAddress}</div>

                          {o.city && <span className="text-[10px] uppercase font-bold text-slate-400">{o.city}</span>}

                        </td>

                        <td className="p-4 whitespace-nowrap">

                          <div className={`font-bold ${textTitle}`}>{formatTZS(o.totalAmount)}</div>

                          {o.paidAmount !== undefined && o.paidAmount > 0 && o.paidAmount < o.totalAmount ? (

                            <div className="text-[10px] font-bold text-amber-500 flex flex-col">

                              <span>Paid: {formatTZS(o.paidAmount)}</span>

                              <span className="text-rose-500">Due: {formatTZS(o.totalAmount - o.paidAmount)}</span>

                            </div>

                          ) : (

                            <div className={`text-[11px] ${textSub}`}>{o.items.reduce((a, c) => a + c.quantity, 0)} items</div>

                          )}

                        </td>

                        <td className="p-4">

                          {o.trackingNumber ? (

                            <div className="space-y-0.5">

                              <span className="font-mono text-[11px] font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 block w-fit">

                                {o.trackingNumber}

                              </span>

                              {o.courierName && (

                                <span className={`text-[10px] block font-medium ${textSub}`}>

                                  via {o.courierName}

                                </span>

                              )}

                            </div>

                          ) : (

                            <span className="text-[11px] text-slate-400 italic">No tracking code yet</span>

                          )}

                        </td>

                        <td className="p-4">

                          <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border inline-flex items-center gap-1 ${
                            o.status === 'Delivered' || o.status === 'Completed'
                              ? isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : o.status === 'transferred-to-pos'
                              ? isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/80' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : o.status === 'Shipped'
                              ? isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200'
                              : o.status === 'Processing'
                              ? isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-200'
                              : o.status === 'Cancelled'
                              ? isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/80' : 'bg-rose-50 text-rose-700 border-rose-200'
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {o.status}
                          </span>

                        </td>

                        <td className="p-4">

                          <div className="flex flex-col gap-1.5 min-w-[150px]">

                            <select

                              value={o.paymentStatus || 'Pending'}

                              onChange={(e) => {

                                const newPaymentStatus = e.target.value as 'Pending' | 'Partial' | 'Paid' | 'Failed';

                                if (updateOrder) {

                                  const updatedPaidAmount = newPaymentStatus === 'Paid' ? o.totalAmount : newPaymentStatus === 'Pending' ? 0 : o.paidAmount;

                                  updateOrder({
                                    ...o,
                                    paymentStatus: newPaymentStatus,
                                    paidAmount: updatedPaidAmount,
                                    outstandingBalance: Math.max(0, o.totalAmount - (updatedPaidAmount || 0))
                                  });
                                }
                              }}

                              className={`border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${

                                o.paymentStatus === 'Paid'

                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'

                                  : o.paymentStatus === 'Partial'

                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'

                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'

                              }`}

                            >

                              <option value="Pending">Payment Pending</option>

                              <option value="Partial">Partial Payment Paid</option>

                              <option value="Paid">Paid & Confirmed</option>

                              <option value="Failed">Payment Failed</option>

                            </select>



                            {o.paymentStatus === 'Paid' ? (

                              <button

                                type="button"

                                onClick={() => {

                                  setLastReceipt({

                                    id: o.id,

                                    createdAt: o.createdAt,

                                    cashierName: 'Online Marketplace Admin',

                                    items: o.items,

                                    subtotal: o.totalAmount * 0.84,

                                    tax: o.totalAmount * 0.16,

                                    discount: 0,

                                    total: o.totalAmount,

                                    paymentMethod: o.paymentMethod || 'Online Bank Transfer / Mobile Money',

                                  });

                                }}

                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-sm w-fit active:scale-95"

                                title="Print / Download Official Payment Receipt"

                              >

                                <Printer className="w-3 h-3" />

                                <span>Get Payment Receipt</span>

                              </button>

                            ) : (

                              <div className="flex flex-col gap-1">

                                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">

                                  Receipt locked until marked Paid

                                </span>

                                {updateOrder && (

                                  <button

                                    type="button"

                                    onClick={() => updateOrder({ ...o, paymentStatus: 'Paid' })}

                                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold text-left w-fit transition-colors"

                                    title="Click to confirm customer payment as Paid"

                                  >

                                    + Confirm as Paid

                                  </button>

                                )}

                              </div>

                            )}

                          </div>

                        </td>

                        <td className="p-4 text-right">

                          <div className="flex items-center justify-end gap-2">

                            {(() => {
                              const isTransferred = Boolean(o.status === 'transferred-to-pos' || o.transferredToPos || o.transferred_to_pos || o.orderType === 'online_to_pos' || o.order_type === 'online_to_pos');
                              const isOpenForPos = (o.paymentStatus || 'Pending') !== 'Paid' && o.status !== 'Cancelled' && o.status !== 'Completed';
                              if (!isOpenForPos) return null;
                              if (isTransferred && onOpenInPos) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => onOpenInPos(o)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/25 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                                    title="Continue this transferred online order inside Offline POS"
                                  >
                                    <Store className="w-3.5 h-3.5" />
                                    <span>Open in POS</span>
                                  </button>
                                );
                              }
                              if (!isTransferred && onTransferToPos) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => onTransferToPos(o)}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-500/25 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                                    title="Transfer this Online Order to Offline POS Register / Orbi Pay"
                                  >
                                    <Store className="w-3.5 h-3.5" />
                                    <span>Transfer to POS</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}

                            <button

                              type="button"

                              onClick={() => setSelectedOrderForInvoice(o)}

                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"

                              title="Print or Download Official Tax Invoice (Available for all orders)"

                            >

                              <FileText className="w-3.5 h-3.5 text-blue-500" />

                              <span>Tax Invoice</span>

                            </button>



                            <select

                              value={o.status}

                              onChange={(e) => {

                                const newStatus = e.target.value as Order['status'];

                                if (updateOrder) {

                                  updateOrder({ ...o, status: newStatus });

                                } else {

                                  updateOrderStatus(o.id, newStatus);

                                }

                              }}

                              className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold ${

                                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'

                              }`}

                            >

                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="transferred-to-pos">transferred-to-pos</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>



                            <button

                              onClick={() => {

                                setSelectedOrderForDispatch(o);

                                setDispatchStatus(o.status);

                                setDispatchTrackingNumber(o.trackingNumber || `GE-TRK-${Math.floor(Math.random() * 9000000 + 1000000)}`);

                                setDispatchCourier(o.courierName || 'DAR Express (Local)');

                                setDispatchEstimatedDelivery(o.estimatedDelivery || 'Within 24-48 Hours');

                                setDispatchNotes(o.notes || '');

                                const paidVal = o.paidAmount ?? (o.paymentStatus === 'Paid' ? o.totalAmount : 0);

                                setDispatchPaidAmount(paidVal);

                                setDispatchPaymentStatus(o.paymentStatus || (paidVal >= o.totalAmount ? 'Paid' : paidVal > 0 ? 'Partial' : 'Pending'));

                              }}

                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"

                            >

                              <Truck className="w-3.5 h-3.5" />

                              <span>Dispatch & Track</span>

                            </button>

                            {deleteOrder && (

                              <button

                                onClick={async () => {

                                  if (await customConfirm(`Delete order ${o.id}?`, 'Delete Order')) {

                                    await deleteOrder(o.id);

                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== o.id));

                                  }

                                }}

                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all shadow-sm"

                                title="Delete Order"

                              >

                                <Trash2 className="w-4 h-4" />

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    );
                    })}
                    {filteredAdminOrders.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Store className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                            <div className={`text-sm font-bold ${textTitle}`}>No matching orders found</div>
                            <div className={`text-xs ${textSub}`}>
                              {orderStatusFilter === 'transferred-to-pos'
                                ? 'No orders have been transferred to Offline POS yet.'
                                : 'Try clearing your search or status filter.'}
                            </div>
                            {(orderStatusFilter !== 'All' || orderSearchQuery.trim() !== '') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderStatusFilter('All');
                                  setOrderSearchQuery('');
                                }}
                                className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                              >
                                Show All Orders
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>
            </div>
              );
            })()}



            {/* Dispatch & Order Tracking Modal */}

            {selectedOrderForDispatch && (

              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">

                <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>

                  <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">

                    <div className="flex items-center gap-3">

                      <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">

                        <Truck className="w-5 h-5" />

                      </div>

                      <div>

                        <h3 className="font-extrabold text-base">Order Dispatch & Live Tracking</h3>

                        <p className="text-xs text-slate-500">Order #{selectedOrderForDispatch.id} • {selectedOrderForDispatch.customerName}</p>

                      </div>

                    </div>

                    <button

                      onClick={() => setSelectedOrderForDispatch(null)}

                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"

                    >

                      <X className="w-5 h-5" />

                    </button>

                  </div>



                  <div className="space-y-4">

                    <div>

                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                        Order Status

                      </label>

                      <select

                        value={dispatchStatus}

                        onChange={(e) => setDispatchStatus(e.target.value as any)}

                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${

                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                        }`}

                      >

                        <option value="Pending">Pending (Awaiting Confirmation)</option>
                        <option value="Processing">Processing (Packed & Ready)</option>
                        <option value="transferred-to-pos">transferred-to-pos (In Offline POS)</option>
                        <option value="Shipped">Shipped (In Transit / Dispatched)</option>
                        <option value="Delivered">Delivered (Handed to Customer)</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                    </div>



                    <div>

                      <div className="flex items-center justify-between mb-1.5">

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">

                          Tracking Number

                        </label>

                        <button

                          type="button"

                          onClick={() => setDispatchTrackingNumber(`GE-TRK-${Math.floor(Math.random() * 9000000 + 1000000)}`)}

                          className="text-[11px] font-bold text-blue-500 hover:underline"

                        >

                          Generate New

                        </button>

                      </div>

                      <input

                        type="text"

                        value={dispatchTrackingNumber}

                        onChange={(e) => setDispatchTrackingNumber(e.target.value)}

                        placeholder="e.g. GE-TRK-7829103"

                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold ${

                          isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'

                        }`}

                      />

                    </div>



                    <div className="grid grid-cols-2 gap-3">

                      <div>

                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                          Courier / Carrier

                        </label>

                        <select

                          value={dispatchCourier}

                          onChange={(e) => setDispatchCourier(e.target.value)}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${

                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                          }`}

                        >

                          <option value="DAR Express (Local)">DAR Express (Local)</option>

                          <option value="DHL Tanzania">DHL Tanzania</option>

                          <option value="Posta Tanzania">Posta Tanzania (EMS)</option>

                          <option value="Aramex Tanzania">Aramex Tanzania</option>

                          <option value="Own Store Fleet / Rider">Own Store Fleet / Rider</option>

                          <option value="Store Pickup (Kariakoo)">Store Pickup (Kariakoo)</option>

                        </select>

                      </div>



                      <div>

                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                          Estimated Delivery

                        </label>

                        <input

                          type="text"

                          value={dispatchEstimatedDelivery}

                          onChange={(e) => setDispatchEstimatedDelivery(e.target.value)}

                          placeholder="e.g. Within 24 Hours"

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${

                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                          }`}

                        />

                      </div>

                    </div>



                    <div>

                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                        Dispatch Notes (Visible to Customer)

                      </label>

                      <textarea

                        rows={2}

                        value={dispatchNotes}

                        onChange={(e) => setDispatchNotes(e.target.value)}

                        placeholder="e.g. Package dispatched via express motorbike with seal inspection verified."

                        className={`w-full px-3.5 py-2 rounded-xl border text-xs ${

                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                        }`}

                      />

                    </div>

                    {/* Partial / Partial Payment Management for Online Orders */}
                    <div className={`p-3.5 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                          <span>Online Order Partial Payment & Delivery Balance</span>
                        </label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          dispatchPaymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : dispatchPaymentStatus === 'Partial'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {dispatchPaymentStatus === 'Paid' ? 'Fully Paid' : dispatchPaymentStatus === 'Partial' ? 'Partial Deposit' : 'Unpaid / Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center font-bold p-2.5 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-normal">Total Order</span>
                          <span className="text-slate-800 dark:text-slate-100">{formatTZS(selectedOrderForDispatch.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500 block font-normal">Customer Paid</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatTZS(dispatchPaidAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-500 block font-normal">Outstanding for Delivery</span>
                          <span className="text-rose-600 dark:text-rose-400 font-black">
                            {formatTZS(Math.max(0, selectedOrderForDispatch.totalAmount - dispatchPaidAmount))}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Customer Paid Amount (TZS)</label>
                          <input
                            type="number"
                            value={dispatchPaidAmount || ''}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setDispatchPaidAmount(val);
                              if (val >= selectedOrderForDispatch.totalAmount) {
                                setDispatchPaymentStatus('Paid');
                              } else if (val > 0) {
                                setDispatchPaymentStatus('Partial');
                              } else {
                                setDispatchPaymentStatus('Pending');
                              }
                            }}
                            placeholder="Amount customer paid"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Status</label>
                          <select
                            value={dispatchPaymentStatus}
                            onChange={(e) => {
                              const st = e.target.value as 'Pending' | 'Partial' | 'Paid' | 'Failed';
                              setDispatchPaymentStatus(st);
                              if (st === 'Paid') {
                                setDispatchPaidAmount(selectedOrderForDispatch.totalAmount);
                              } else if (st === 'Pending') {
                                setDispatchPaidAmount(0);
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          >
                            <option value="Pending">Pending (Unpaid)</option>
                            <option value="Partial">Partial Payment Paid</option>
                            <option value="Paid">Fully Paid (100%)</option>
                            <option value="Failed">Payment Failed</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchPaidAmount(selectedOrderForDispatch.totalAmount);
                            setDispatchPaymentStatus('Paid');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          Full Payment (100%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.round(selectedOrderForDispatch.totalAmount * 0.5);
                            setDispatchPaidAmount(half);
                            setDispatchPaymentStatus('Partial');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          50% Deposit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchPaidAmount(0);
                            setDispatchPaymentStatus('Pending');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors"
                        >
                          Clear Payment
                        </button>
                      </div>
                    </div>

                  </div>



                  <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">

                    <button

                      type="button"

                      onClick={() => setSelectedOrderForDispatch(null)}

                      className={`px-4 py-2 rounded-xl border font-bold text-xs ${

                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'

                      }`}

                    >

                      Cancel

                    </button>

                    <button

                      type="button"

                      onClick={() => {

                        const updated: Order = {

                          ...selectedOrderForDispatch,

                          status: dispatchStatus,

                          trackingNumber: dispatchTrackingNumber,

                          courierName: dispatchCourier,

                          estimatedDelivery: dispatchEstimatedDelivery,

                          notes: dispatchNotes,

                          paymentStatus: dispatchPaymentStatus,

                          paidAmount: dispatchPaidAmount,

                          outstandingBalance: Math.max(0, selectedOrderForDispatch.totalAmount - dispatchPaidAmount),

                        };

                        if (updateOrder) {

                          updateOrder(updated);

                        } else {

                          updateOrderStatus(updated.id, dispatchStatus);

                        }

                        setSelectedOrderForDispatch(null);

                      }}

                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"

                    >

                      <Check className="w-4 h-4" />

                      <span>Save & Sync Globally</span>

                    </button>

                  </div>

                </div>

              </div>

            )}

          </div>

    </>
  );
};
