import React, { useState, useMemo } from 'react';
import { SaleReturn, SaleReturnItem, POSTransaction, Order, Product, StoreSettings } from '../../../types';
import {
  Undo2,
  Search,
  Filter,
  Plus,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  TrendingDown,
  Receipt,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  PackageCheck,
  Tag
} from 'lucide-react';
import { customConfirm } from '../../../utils/dialog';

export interface POSSalesReturnsManagerProps {
  salesReturns: SaleReturn[];
  posTransactions: POSTransaction[];
  orders: Order[];
  products: Product[];
  storeSettings: StoreSettings;
  onAddSaleReturn: (ret: SaleReturn) => Promise<void> | void;
  onUpdateSaleReturn?: (ret: SaleReturn) => Promise<void> | void;
  onDeleteSaleReturn?: (returnId: string) => Promise<void> | void;
  onUpdatePOSTransaction?: (tx: POSTransaction) => Promise<any> | void;
  onUpdateProduct: (product: Product) => Promise<void> | void;
  onSwitchToRegister: () => void;
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

export const POSSalesReturnsManager: React.FC<POSSalesReturnsManagerProps> = ({
  salesReturns = [],
  posTransactions = [],
  orders = [],
  products = [],
  storeSettings,
  onAddSaleReturn,
  onUpdateSaleReturn,
  onDeleteSaleReturn,
  onUpdatePOSTransaction,
  onUpdateProduct,
  onSwitchToRegister,
  isDark,
  cardBg,
  textTitle,
  textSub,
  inputBg,
  modalBg = cardBg,
  formatTZS,
  formatToGMT3,
  activeCashierName,
  showAlert,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Pending'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<SaleReturn | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Sale Return Form State
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<POSTransaction | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Store Credit' | 'Exchange'>('Cash');
  const [refundStatus, setRefundStatus] = useState<'Completed' | 'Pending'>('Completed');
  const [returnReason, setReturnReason] = useState('Customer model exchange / altered preference');
  const [restockItems, setRestockItems] = useState(true);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<SaleReturnItem[]>([]);

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return salesReturns
      .filter((r) => {
        if (statusFilter !== 'all' && (r.refundStatus || r.refund_status) !== statusFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const rNum = (r.returnNumber || r.return_number || '').toLowerCase();
          const rcp = (r.receiptNumber || r.receipt_number || '').toLowerCase();
          const cName = (r.customerName || r.customer_name || '').toLowerCase();
          const cPhone = (r.customerPhone || r.customer_phone || '').toLowerCase();
          const hasItem = (r.items || []).some((it) => it.productName?.toLowerCase().includes(q));
          if (!rNum.includes(q) && !rcp.includes(q) && !cName.includes(q) && !cPhone.includes(q) && !hasItem) {
            return false;
          }
        }

        if (dateFilter !== 'all') {
          const dateStr = r.createdAt || r.created_at || '';
          const rDate = new Date(dateStr);
          const now = new Date();
          if (dateFilter === 'today') {
            const todayStr = now.toISOString().slice(0, 10);
            if (!dateStr.startsWith(todayStr)) return false;
          } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (rDate < weekAgo) return false;
          } else if (dateFilter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (rDate < monthAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [salesReturns, statusFilter, searchTerm, dateFilter]);

  // Aggregate Metrics
  const totalRefundAmount = useMemo(() => {
    return salesReturns.reduce((acc, r) => acc + (Number(r.totalRefundAmount || r.total_refund_amount) || 0), 0);
  }, [salesReturns]);

  const totalRestockedUnits = useMemo(() => {
    return salesReturns.reduce((acc, r) => {
      const isRestocked = r.restockItems ?? r.restock_items ?? true;
      if (!isRestocked) return acc;
      const count = (r.items || []).reduce((sum, it) => sum + (it.condition === 'Restockable' ? (Number(it.quantity) || 0) : 0), 0);
      return acc + count;
    }, 0);
  }, [salesReturns]);

  // Search receipts from POS transactions
  const matchingTransactions = useMemo(() => {
    if (!receiptSearchQuery.trim()) return posTransactions.slice(0, 10);
    const q = receiptSearchQuery.toLowerCase();
    return posTransactions.filter((tx) => {
      const rNum = (tx.receiptNumber || tx.receipt_number || '').toLowerCase();
      const cName = (tx.customerName || tx.customer_name || '').toLowerCase();
      const cPhone = (tx.customerPhone || tx.customer_phone || '').toLowerCase();
      return rNum.includes(q) || cName.includes(q) || cPhone.includes(q);
    });
  }, [receiptSearchQuery, posTransactions]);

  const handleSelectTransaction = (tx: POSTransaction) => {
    setSelectedTransaction(tx);
    setReceiptNumber(tx.receiptNumber || tx.receipt_number || tx.id);
    setCustomerName(tx.customerName || tx.customer_name || 'Counter Customer');
    setCustomerPhone(tx.customerPhone || tx.customer_phone || '');

    // Pre-populate items from transaction
    const candidateItems: SaleReturnItem[] = (tx.items || []).map((it) => {
      const pName = it.name || it.product?.name || 'Electronic Item';
      const pId = it.productId || it.product_id || it.product?.id || `prod-${Math.random()}`;
      const price = Number(it.price) || Number(it.product?.price) || 0;
      const qty = Number(it.quantity) || 1;
      return {
        id: `sri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: pId,
        productName: pName,
        quantity: qty,
        unitPrice: price,
        totalRefund: qty * price,
        condition: 'Restockable',
        reason: 'Customer return',
      };
    });
    setReturnItems(candidateItems);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    const updated = [...returnItems];
    if (newQty <= 0) {
      setReturnItems(updated.filter((_, i) => i !== index));
      return;
    }
    updated[index].quantity = newQty;
    updated[index].totalRefund = newQty * updated[index].unitPrice;
    setReturnItems(updated);
  };

  const handleUpdateItemCondition = (index: number, condition: 'Restockable' | 'Damaged') => {
    const updated = [...returnItems];
    updated[index].condition = condition;
    setReturnItems(updated);
  };

  const returnGrandTotal = useMemo(() => {
    return returnItems.reduce((acc, it) => acc + (Number(it.totalRefund) || 0), 0);
  }, [returnItems]);

  const handleOpenNewModal = () => {
    setReceiptSearchQuery('');
    setSelectedTransaction(null);
    setReceiptNumber(`RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setRefundMethod('Cash');
    setRefundStatus('Completed');
    setReturnReason('Defective accessory or customer model exchange');
    setRestockItems(true);
    setReturnNotes('');
    setReturnItems([]);
    setIsNewReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showAlert('Missing Customer', 'Please enter customer name.', 'error');
      return;
    }

    if (returnItems.length === 0) {
      showAlert('No Items', 'Please select at least one item being returned.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const returnId = `sr-${Date.now()}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const generatedReturnNumber = `SR-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`;

      const newReturn: SaleReturn = {
        id: returnId,
        returnNumber: generatedReturnNumber,
        return_number: generatedReturnNumber,
        referenceType: 'pos',
        reference_type: 'pos',
        referenceId: selectedTransaction?.id || undefined,
        reference_id: selectedTransaction?.id || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        receipt_number: receiptNumber.trim() || undefined,
        customerName: customerName.trim(),
        customer_name: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        items: returnItems,
        totalRefundAmount: returnGrandTotal,
        total_refund_amount: returnGrandTotal,
        refundMethod,
        refund_method: refundMethod,
        refundStatus,
        refund_status: refundStatus,
        reason: returnReason.trim(),
        restockItems,
        restock_items: restockItems,
        notes: returnNotes.trim() || undefined,
        processedBy: activeCashierName,
        processed_by: activeCashierName,
        createdAt: nowStr,
        created_at: nowStr,
      };

      await onAddSaleReturn(newReturn);

      // Update linked POS transaction status when full return is completed
      if (selectedTransaction && refundStatus === 'Completed' && onUpdatePOSTransaction) {
        const txGross = Number(selectedTransaction.total ?? selectedTransaction.totalAmount ?? 0);
        const txIdLower = String(selectedTransaction.id || '').toLowerCase();
        const txReceiptLower = String(selectedTransaction.receiptNumber || selectedTransaction.receipt_number || '').toLowerCase();
        const priorReturned = salesReturns
          .filter((r) => {
            const st = String(r.refundStatus || r.refund_status || 'Completed').toLowerCase();
            if (st === 'pending' || st === 'cancelled') return false;
            const refId = String(r.referenceId || r.reference_id || '').toLowerCase();
            const rcp = String(r.receiptNumber || r.receipt_number || '').toLowerCase();
            return (refId && (refId === txIdLower || (txReceiptLower && refId === txReceiptLower))) ||
              (rcp && (rcp === txIdLower || (txReceiptLower && rcp === txReceiptLower)));
          })
          .reduce((sum, r) => sum + (Number(r.totalRefundAmount ?? r.total_refund_amount ?? 0) || 0), 0);

        if (txGross > 0 && priorReturned + returnGrandTotal >= txGross && selectedTransaction.status !== 'Refunded') {
          await onUpdatePOSTransaction({
            ...selectedTransaction,
            status: 'Refunded',
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Increment inventory stock if restockable
      if (restockItems) {
        for (const it of returnItems) {
          if (it.condition === 'Restockable') {
            const prod = products.find((p) => p.id === it.productId);
            if (prod) {
              const currentStock = Number(prod.stock) || 0;
              const newStock = currentStock + it.quantity;
              await onUpdateProduct({ ...prod, stock: newStock });
            }
          }
        }
      }

      setIsNewReturnModalOpen(false);
      setSelectedReturnForView(newReturn);
      showAlert('Return Processed', `Sales return ${generatedReturnNumber} processed successfully. Sales history & inventory updated!`, 'success');
    } catch (err: any) {
      console.error('Error saving sales return:', err);
      showAlert('Save Error', err?.message || 'Failed to process sales return.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintCreditNote = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 shadow-xs`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Undo2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black tracking-tight ${textTitle}`}>Sales Returns & Restocking</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Customer POS Returns & Credit Notes
                </span>
              </div>
              <p className={`text-xs ${textSub} mt-0.5`}>
                Handle customer merchandise returns, issue credit notes or cash refunds, and restock items back into active inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
              <span>Back to Register</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition-all shadow-md shadow-rose-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Process Sales Return</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Total Refunded Amount</span>
            <span className={`text-lg font-black tracking-tight text-rose-500 block mt-0.5`}>
              {formatTZS(totalRefundAmount)}
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>{salesReturns.length} Total Customer Returns</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Units Restocked to Shelf</span>
            <span className={`text-lg font-black tracking-tight text-emerald-500 block mt-0.5`}>
              +{totalRestockedUnits.toLocaleString()} Pcs
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Restored back to sellable inventory</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Completed Settlements</span>
            <span className={`text-lg font-black tracking-tight text-blue-500 block mt-0.5`}>
              {salesReturns.filter((r) => (r.refundStatus || r.refund_status) === 'Completed').length} Returns
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Settled via Cash / Mobile / Credit</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Logged Cashier</span>
            <span className={`text-lg font-black tracking-tight ${textTitle} block mt-0.5`}>
              {activeCashierName}
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Authorized POS operator</span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className={`p-4 rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search return #, receipt #, customer phone, item..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {(['all', 'Completed', 'Pending'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-rose-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Settlements' : st}
              </button>
            ))}
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${inputBg} border-slate-200 dark:border-slate-700`}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Returns List Table */}
      <div className={`rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <th className="py-3 px-4 font-black">Credit Note #</th>
                <th className="py-3 px-4 font-black">Date & Time</th>
                <th className="py-3 px-4 font-black">Customer</th>
                <th className="py-3 px-4 font-black">Original Receipt</th>
                <th className="py-3 px-4 font-black text-center">Restocked</th>
                <th className="py-3 px-4 font-black text-right">Refund Total</th>
                <th className="py-3 px-4 font-black text-center">Refund Method</th>
                <th className="py-3 px-4 font-black">Processed By</th>
                <th className="py-3 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Undo2 className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className={`text-sm font-bold ${textTitle}`}>No Sales Returns Found</p>
                    <p className={`text-xs ${textSub} mt-0.5`}>
                      {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria or filters.' : 'Click "Process Sales Return" to process customer returns.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                  const rNum = ret.returnNumber || ret.return_number || ret.id;
                  const cName = ret.customerName || ret.customer_name || 'Walk-in Customer';
                  const rcp = ret.receiptNumber || ret.receipt_number || 'Direct';
                  const tot = Number(ret.totalRefundAmount || ret.total_refund_amount) || 0;
                  const isRestocked = ret.restockItems ?? ret.restock_items ?? true;
                  const method = ret.refundMethod || ret.refund_method || 'Cash';
                  const dateDisplay = ret.createdAt || ret.created_at || '—';

                  return (
                    <tr
                      key={ret.id}
                      className={`hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                        {rNum}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateDisplay}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold block truncate max-w-[180px]">{cName}</span>
                        {(ret.customerPhone || ret.customer_phone) && (
                          <span className="text-[10px] text-slate-400 block">{ret.customerPhone || ret.customer_phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {rcp}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isRestocked
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isRestocked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>{isRestocked ? 'Restocked' : 'Scrapped'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-right whitespace-nowrap">
                        {formatTZS(tot)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                        {ret.processedBy || ret.processed_by || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForView(ret)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 transition-all"
                            title="View Credit Note Voucher"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL: Process New Sales Return */}
      {isNewReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base sm:text-lg font-black tracking-tight ${textTitle}`}>Process Customer Sales Return</h2>
                  <p className={`text-xs ${textSub}`}>Return merchandise, issue credit note or refund, and restock products</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReturnModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Receipt Lookup & Selection */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5`}>
                  <Search className="w-3.5 h-3.5" />
                  <span>Lookup Original Receipt / POS Sale</span>
                </h3>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>
                    Search Past POS Sale by Receipt #, Customer Name, or Phone
                  </label>
                  <input
                    type="text"
                    value={receiptSearchQuery}
                    onChange={(e) => setReceiptSearchQuery(e.target.value)}
                    placeholder="Type to filter past transactions (e.g. RCP-2026-..., 0754..., Bakari)..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                  />
                </div>

                {matchingTransactions.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {matchingTransactions.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => handleSelectTransaction(tx)}
                        className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all ${
                          selectedTransaction?.id === tx.id ? 'bg-rose-50/80 dark:bg-rose-950/50 border-l-4 border-rose-500 font-bold' : ''
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 mr-2">
                            {tx.receiptNumber || tx.receipt_number || tx.id}
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {tx.customerName || tx.customer_name || 'Counter Customer'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black block">{formatTZS(Number(tx.total) || 0)}</span>
                          <span className="text-[10px] text-slate-400 block">{tx.createdAt || 'Recent'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer & Return Info */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5`}>
                  <User className="w-3.5 h-3.5" />
                  <span>Customer & Credit Note Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Customer Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+255..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Original Receipt Reference #</label>
                    <input
                      type="text"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="Receipt #"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>
                </div>
              </div>

              {/* Items Being Returned */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5`}>
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Return Items & Restock Inspection</span>
                  </h3>

                  {/* Restock checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <input
                      type="checkbox"
                      checked={restockItems}
                      onChange={(e) => setRestockItems(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Restock valid items to store inventory (+ stock)</span>
                  </label>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'}`}>
                        <th className="py-2.5 px-3 font-bold">Item Description</th>
                        <th className="py-2.5 px-3 font-bold text-center">Return Qty</th>
                        <th className="py-2.5 px-3 font-bold text-right">Unit Price</th>
                        <th className="py-2.5 px-3 font-bold text-right">Refund Total</th>
                        <th className="py-2.5 px-3 font-bold text-center">Shelf Restock?</th>
                        <th className="py-2.5 px-3 font-bold text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {returnItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Select a receipt above or add items to return.
                          </td>
                        </tr>
                      ) : (
                        returnItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-bold truncate max-w-[220px]">{item.productName}</td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(idx, parseInt(e.target.value) || 0)}
                                className={`w-16 px-2 py-1 rounded-lg border text-center font-black ${inputBg} border-slate-200 dark:border-slate-700`}
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatTZS(item.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-rose-500">{formatTZS(item.totalRefund)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={item.condition}
                                onChange={(e) => handleUpdateItemCondition(idx, e.target.value as any)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                                  item.condition === 'Restockable'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                                }`}
                              >
                                <option value="Restockable">Restockable</option>
                                <option value="Damaged">Damaged / Scrap</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(idx, 0)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {returnItems.length > 0 && (
                      <tfoot>
                        <tr className={`border-t font-black ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                          <td colSpan={3} className="py-2.5 px-3 text-right">Total Refund Due:</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-mono text-sm">
                            {formatTZS(returnGrandTotal)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Settlement Method & Reason */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5`}>
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Refund Method & Reason</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Refund Method</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="Cash">Cash Refund at Counter</option>
                      <option value="Mobile Money">Mobile Money (M-Pesa / Airtel)</option>
                      <option value="Store Credit">Store Credit / Exchange Voucher</option>
                      <option value="Bank Transfer">Bank Settlement</option>
                      <option value="Exchange">Direct Product Replacement</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Return Reason</label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Model upgrade, warranty return, defective plug..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Cashier Notes</label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Enter customer feedback, condition verification notes, or manager approval..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewReturnModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || returnItems.length === 0}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Refund...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Issue Credit Note & Complete Return</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View & Print Credit Note */}
      {selectedReturnForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                <h3 className={`text-sm font-black ${textTitle}`}>
                  Customer Credit Note: {selectedReturnForView.returnNumber || selectedReturnForView.return_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCreditNote}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Credit Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReturnForView(null)}
                  className="p-1 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200 font-sans print:p-0 print:text-black">
              <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-black tracking-tight">{storeSettings.storeName}</h2>
                <p className="text-[11px] text-slate-500">{storeSettings.tagline}</p>
                <p className="text-[11px] text-slate-500">{storeSettings.address} • Tel: {storeSettings.phone}</p>
                <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  Official Customer Credit Note Voucher
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px]">ISSUED TO CUSTOMER:</span>
                  <span className="font-bold text-sm block">{selectedReturnForView.customerName || selectedReturnForView.customer_name}</span>
                  {(selectedReturnForView.customerPhone || selectedReturnForView.customer_phone) && (
                    <span className="block text-slate-500">Tel: {selectedReturnForView.customerPhone || selectedReturnForView.customer_phone}</span>
                  )}
                  <span className="block text-slate-500 mt-1">Reason: {selectedReturnForView.reason}</span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-400 block text-[10px]">CREDIT NOTE REF:</span>
                  <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400 block">
                    {selectedReturnForView.returnNumber || selectedReturnForView.return_number}
                  </span>
                  <span className="block text-slate-500">Receipt Ref: {selectedReturnForView.receiptNumber || selectedReturnForView.receipt_number || 'Direct'}</span>
                  <span className="block text-slate-500">Date: {selectedReturnForView.createdAt || selectedReturnForView.created_at}</span>
                  <span className="block text-slate-500">Cashier: {selectedReturnForView.processedBy || selectedReturnForView.processed_by || 'Staff'}</span>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="p-2 border border-slate-200 dark:border-slate-700">Returned Item</th>
                    <th className="p-2 text-center border border-slate-200 dark:border-slate-700">Qty</th>
                    <th className="p-2 text-right border border-slate-200 dark:border-slate-700">Unit Price</th>
                    <th className="p-2 text-right border border-slate-200 dark:border-slate-700">Refund TZS</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReturnForView.items || []).map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="p-2 border border-slate-200 dark:border-slate-700 font-bold">{it.productName}</td>
                      <td className="p-2 text-center border border-slate-200 dark:border-slate-700 font-black text-rose-600">-{it.quantity}</td>
                      <td className="p-2 text-right border border-slate-200 dark:border-slate-700">{formatTZS(it.unitPrice)}</td>
                      <td className="p-2 text-right border border-slate-200 dark:border-slate-700 font-black">{formatTZS(it.totalRefund)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-black">
                    <td colSpan={3} className="p-2 text-right border border-slate-200 dark:border-slate-700">Total Refund Granted:</td>
                    <td className="p-2 text-right border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 font-mono">
                      {formatTZS(Number(selectedReturnForView.totalRefundAmount || selectedReturnForView.total_refund_amount) || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold">Refund Method: </span>
                  <span>{selectedReturnForView.refundMethod || selectedReturnForView.refund_method}</span>
                </div>
                <div>
                  <span className="font-bold">Inventory Status: </span>
                  <span className="font-black text-emerald-600 uppercase">
                    {(selectedReturnForView.restockItems ?? selectedReturnForView.restock_items ?? true) ? 'Restocked to Active Shelf' : 'Item Scrapped / Damaged'}
                  </span>
                </div>
              </div>

              {selectedReturnForView.notes && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 italic">
                  Note: {selectedReturnForView.notes}
                </div>
              )}

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                  <p className="font-bold">Authorized by Genuine Electronics</p>
                  <p className="text-[10px] text-slate-400">Cashier / Store Manager Signature</p>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                  <p className="font-bold">Customer Acknowledgment</p>
                  <p className="text-[10px] text-slate-400">Customer Signature & Refund Received</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
