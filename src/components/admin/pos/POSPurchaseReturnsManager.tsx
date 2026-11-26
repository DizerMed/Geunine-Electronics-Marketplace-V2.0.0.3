import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseReturn, PurchaseReturnItem, Purchase, Product, StoreSettings, BRAND_LOGO_URL } from '../../../types';
import {
  RotateCcw,
  Search,
  Filter,
  Plus,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  PackageMinus
} from 'lucide-react';
import { customConfirm } from '../../../utils/dialog';

export interface POSPurchaseReturnsManagerProps {
  purchaseReturns: PurchaseReturn[];
  purchases: Purchase[];
  products: Product[];
  storeSettings: StoreSettings;
  onAddPurchaseReturn: (ret: PurchaseReturn) => Promise<void> | void;
  onUpdatePurchaseReturn?: (ret: PurchaseReturn) => Promise<void> | void;
  onDeletePurchaseReturn?: (returnId: string) => Promise<void> | void;
  onUpdateProduct: (product: Product) => Promise<void> | void;
  onSwitchToPurchases?: () => void;
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

export const POSPurchaseReturnsManager: React.FC<POSPurchaseReturnsManagerProps> = ({
  purchaseReturns = [],
  purchases = [],
  products = [],
  storeSettings,
  onAddPurchaseReturn,
  onUpdatePurchaseReturn,
  onDeletePurchaseReturn,
  onUpdateProduct,
  onSwitchToPurchases,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'Refunded' | 'Credit Note' | 'Pending'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<PurchaseReturn | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Purchase Return Form State
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [refundStatus, setRefundStatus] = useState<'Refunded' | 'Credit Note' | 'Pending'>('Credit Note');
  const [returnReason, setReturnReason] = useState('Factory defect / Non-functional unit');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);

  // Item Selector State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(0);
  const [itemReason, setItemReason] = useState('Damaged packaging during shipment');

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return purchaseReturns
      .filter((r) => {
        if (statusFilter !== 'all' && (r.refundStatus || r.refund_status) !== statusFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const rNum = (r.returnNumber || r.return_number || '').toLowerCase();
          const sName = (r.supplierName || r.supplier_name || '').toLowerCase();
          const pNum = (r.purchaseNumber || r.purchase_number || '').toLowerCase();
          const hasMatchingItem = (r.items || []).some((it) => it.productName?.toLowerCase().includes(q));
          if (!rNum.includes(q) && !sName.includes(q) && !pNum.includes(q) && !hasMatchingItem) {
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
  }, [purchaseReturns, statusFilter, searchTerm, dateFilter]);

  // Aggregate Metrics
  const totalReturnAmount = useMemo(() => {
    return purchaseReturns.reduce((acc, r) => acc + (Number(r.totalAmount || r.total_amount) || 0), 0);
  }, [purchaseReturns]);

  const totalUnitsReturned = useMemo(() => {
    return purchaseReturns.reduce((acc, r) => {
      const units = (r.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      return acc + units;
    }, 0);
  }, [purchaseReturns]);

  // Handle purchase selection to pre-populate items
  const handleSelectPurchase = (purchId: string) => {
    setSelectedPurchaseId(purchId);
    if (!purchId) return;
    const foundPurchase = purchases.find((p) => p.id === purchId);
    if (foundPurchase) {
      setSupplierName(foundPurchase.supplierName || foundPurchase.supplier_name || '');
    }
  };

  const handleAddItemToReturn = () => {
    if (!selectedProductId) {
      showAlert('Product Required', 'Please select a product to return to vendor.', 'error');
      return;
    }
    const product = products.find((pr) => pr.id === selectedProductId);
    if (!product) return;

    if (itemQuantity <= 0) {
      showAlert('Invalid Quantity', 'Return quantity must be at least 1.', 'error');
      return;
    }

    const availableStock = Number(product.stock) || 0;
    if (itemQuantity > availableStock) {
      showAlert('Stock Exceeded', `Cannot return ${itemQuantity} units. Only ${availableStock} units exist in stock.`, 'error');
      return;
    }

    const unitCost = Number(itemUnitCost) >= 0 ? Number(itemUnitCost) : (Number(product.costPrice) || 0);
    const existingIndex = returnItems.findIndex((it) => it.productId === product.id);

    if (existingIndex >= 0) {
      const updated = [...returnItems];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        unitCost,
        totalRefund: newQty * unitCost,
        reason: itemReason,
      };
      setReturnItems(updated);
    } else {
      const newItem: PurchaseReturnItem = {
        id: `pri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        quantity: itemQuantity,
        unitCost,
        totalRefund: itemQuantity * unitCost,
        reason: itemReason,
      };
      setReturnItems([...returnItems, newItem]);
    }

    // Reset line input
    setSelectedProductId('');
    setItemQuantity(1);
    setItemUnitCost(0);
    setItemReason('Factory defect / Non-functional unit');
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const returnGrandTotal = useMemo(() => {
    return returnItems.reduce((acc, it) => acc + (Number(it.totalRefund) || 0), 0);
  }, [returnItems]);

  const handleOpenNewModal = () => {
    setSelectedPurchaseId('');
    setSupplierName('');
    setRefundStatus('Credit Note');
    setReturnReason('Defective / Damaged units returned to supplier');
    setReturnNotes('');
    setReturnItems([]);
    setSelectedProductId('');
    setItemQuantity(1);
    setItemUnitCost(0);
    setItemReason('Factory defect / Non-functional unit');
    setIsNewReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showAlert('Missing Supplier', 'Please enter the vendor or supplier name.', 'error');
      return;
    }

    if (returnItems.length === 0) {
      showAlert('No Items', 'Please add at least one product item to the debit note return.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const returnId = `pr-${Date.now()}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const generatedReturnNumber = `PR-${new Date().getFullYear()}-${String(purchaseReturns.length + 1).padStart(4, '0')}`;
      const foundPurchase = purchases.find((p) => p.id === selectedPurchaseId);

      const newReturn: PurchaseReturn = {
        id: returnId,
        returnNumber: generatedReturnNumber,
        return_number: generatedReturnNumber,
        purchaseId: selectedPurchaseId || undefined,
        purchase_id: selectedPurchaseId || undefined,
        purchaseNumber: foundPurchase ? (foundPurchase.purchaseNumber || foundPurchase.purchase_number) : undefined,
        purchase_number: foundPurchase ? (foundPurchase.purchaseNumber || foundPurchase.purchase_number) : undefined,
        supplierName: supplierName.trim(),
        supplier_name: supplierName.trim(),
        items: returnItems,
        totalAmount: returnGrandTotal,
        total_amount: returnGrandTotal,
        refundStatus,
        refund_status: refundStatus,
        reason: returnReason.trim(),
        notes: returnNotes.trim() || undefined,
        processedBy: activeCashierName,
        processed_by: activeCashierName,
        createdAt: nowStr,
        created_at: nowStr,
      };

      await onAddPurchaseReturn(newReturn);

      // Decrement product stocks (goods left warehouse)
      for (const it of returnItems) {
        const prod = products.find((p) => p.id === it.productId);
        if (prod) {
          const currentStock = Number(prod.stock) || 0;
          const newStock = Math.max(0, currentStock - it.quantity);
          await onUpdateProduct({ ...prod, stock: newStock });
        }
      }

      setIsNewReturnModalOpen(false);
      setSelectedReturnForView(newReturn);
      showAlert('Debit Note Created', `Purchase return ${generatedReturnNumber} created and stock deducted from shelf inventory.`, 'success');
    } catch (err: any) {
      console.error('Error saving purchase return:', err);
      showAlert('Save Error', err?.message || 'Failed to record purchase return.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onBeforePrint = () => {
      if (!document.body.classList.contains('ge-printing-invoice') && document.querySelector('.ge-doc-print-portal')) {
        document.body.classList.add('ge-printing-doc');
      }
    };
    const onAfterPrint = () => document.body.classList.remove('ge-printing-doc');
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove('ge-printing-doc');
    };
  }, []);

  const handlePrintDebitNote = () => {
    document.body.classList.add('ge-printing-doc');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('ge-printing-doc');
    }, 1500);
  };

  const renderDebitNoteSheet = (ret: PurchaseReturn) => {
    const rawDate = ret.createdAt || ret.created_at;
    const formattedDate = rawDate ? formatToGMT3(rawDate) : '—';
    const refNumber = ret.returnNumber || ret.return_number || ret.id;
    const vendorName = ret.supplierName || ret.supplier_name || 'Vendor';
    const purchaseRef = ret.purchaseNumber || ret.purchase_number || 'Direct';
    const processedBy = ret.processedBy || ret.processed_by || 'Staff';
    const status = ret.refundStatus || ret.refund_status || 'Credit Note';
    const totalAmt = Number(ret.totalAmount || ret.total_amount) || 0;

    return (
      <div className="ge-doc-sheet bg-white text-slate-900 font-sans text-xs rounded-xl shadow-xl border border-slate-300 p-6 sm:p-8 space-y-5 max-w-[210mm] mx-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={BRAND_LOGO_URL}
              alt={storeSettings?.storeName || 'Genuine Electronics'}
              className="h-11 w-auto max-w-[110px] object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-slate-900">
                {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
              </h2>
              {storeSettings?.tagline && (
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{storeSettings.tagline}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-0.5">
                {storeSettings?.address || 'Dar es Salaam, Tanzania'} • Tel: {storeSettings?.phone || '+255 768 929 203'}
              </p>
              {(storeSettings?.tin || storeSettings?.vrn) && (
                <p className="text-[10px] font-mono text-slate-600">
                  {storeSettings?.tin ? `TIN: ${storeSettings.tin}` : ''}
                  {storeSettings?.tin && storeSettings?.vrn ? ' | ' : ''}
                  {storeSettings?.vrn ? `VRN: ${storeSettings.vrn}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border-2 border-amber-700">
              Official Supplier Debit Note
            </div>
            <p className="font-mono font-black text-base text-slate-900 mt-1.5">{refNumber}</p>
            <p className="text-[10px] text-slate-600 font-medium">Issued: {formattedDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-300 keep-together">
          <div>
            <span className="font-black text-slate-500 block text-[10px] uppercase tracking-wider">DEBIT TO SUPPLIER:</span>
            <span className="font-black text-sm text-slate-900 block mt-0.5">{vendorName}</span>
            <span className="block text-slate-700 mt-1">
              <strong className="text-slate-900">Reason:</strong> {ret.reason || 'Vendor Return'}
            </span>
          </div>

          <div className="text-right space-y-0.5">
            <span className="font-black text-slate-500 block text-[10px] uppercase tracking-wider">VOUCHER METADATA:</span>
            <span className="block text-slate-700">
              Purchase PO: <strong className="font-mono text-slate-900">{purchaseRef}</strong>
            </span>
            <span className="block text-slate-700">
              Officer: <strong className="text-slate-900">{processedBy}</strong>
            </span>
            <span className="block text-slate-700">
              Settlement: <strong className="text-slate-900">{status}</strong>
            </span>
          </div>
        </div>

        <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black">
                <th className="p-2.5 w-9 text-center">#</th>
                <th className="p-2.5">Returned Item</th>
                <th className="p-2.5 text-center">Return Qty</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-right">Debit Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(ret.items || []).map((it, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-bold text-slate-900">
                    {it.productName}
                    {it.reason && <div className="text-[10px] font-normal text-slate-500">{it.reason}</div>}
                  </td>
                  <td className="p-2.5 text-center font-black text-red-700">-{it.quantity}</td>
                  <td className="p-2.5 text-right text-slate-800">{formatTZS(it.unitCost)}</td>
                  <td className="p-2.5 text-right font-black text-slate-900">{formatTZS(it.totalRefund)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-900">
                <td colSpan={4} className="p-2.5 text-right text-slate-900 uppercase">Total Debit Claim:</td>
                <td className="p-2.5 text-right text-amber-900 font-mono text-sm">
                  {formatTZS(totalAmt)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 border border-slate-300 keep-together">
          <div>
            <span className="font-bold text-slate-600">Settlement Method: </span>
            <span className="font-extrabold text-slate-900">{status}</span>
          </div>
          <div>
            <span className="font-bold text-slate-600">Status: </span>
            <span className="font-black text-amber-800 uppercase bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
              Authorized Return
            </span>
          </div>
        </div>

        {ret.notes && (
          <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 text-[11px] text-slate-700 italic keep-together">
            <strong className="not-italic text-slate-900">Notes:</strong> {ret.notes}
          </div>
        )}

        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs keep-together">
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-black text-slate-900">Authorized By {storeSettings?.storeName || 'Genuine Electronics'}</p>
            <p className="text-[10px] text-slate-500">Inventory Controller / Manager</p>
          </div>
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-black text-slate-900">Received & Acknowledged by Vendor</p>
            <p className="text-[10px] text-slate-500">Supplier Representative Signature & Stamp</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 shadow-xs`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black tracking-tight ${textTitle}`}>Purchase Returns & Debit Notes</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Vendor Stock Deductions
                </span>
              </div>
              <p className={`text-xs ${textSub} mt-0.5`}>
                Return damaged, defective, or oversupplied products to suppliers and issue official Debit Notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onSwitchToPurchases && (
              <button
                type="button"
                onClick={onSwitchToPurchases}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>Stock Purchases</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 active:scale-95 text-white transition-all shadow-md shadow-amber-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Debit Note Return</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Total Returned Value</span>
            <span className={`text-lg font-black tracking-tight text-amber-500 block mt-0.5`}>
              {formatTZS(totalReturnAmount)}
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>{purchaseReturns.length} Total Debit Notes</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Total Returned Units</span>
            <span className={`text-lg font-black tracking-tight text-red-500 block mt-0.5`}>
              {totalUnitsReturned.toLocaleString()} Pcs
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Deducted from store inventory</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Active Vendor Credits</span>
            <span className={`text-lg font-black tracking-tight text-emerald-500 block mt-0.5`}>
              {purchaseReturns.filter((r) => (r.refundStatus || r.refund_status) === 'Credit Note').length} Notes
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Applicable to future invoices</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Processed by Personnel</span>
            <span className={`text-lg font-black tracking-tight ${textTitle} block mt-0.5`}>
              {activeCashierName}
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Authorized store officer</span>
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
            placeholder="Search return #, supplier, purchase ref..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {(['all', 'Credit Note', 'Refunded', 'Pending'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
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
                <th className="py-3 px-4 font-black">Debit Note #</th>
                <th className="py-3 px-4 font-black">Date & Time</th>
                <th className="py-3 px-4 font-black">Supplier</th>
                <th className="py-3 px-4 font-black">Purchase Ref</th>
                <th className="py-3 px-4 font-black">Units Returned</th>
                <th className="py-3 px-4 font-black text-right">Debit Total</th>
                <th className="py-3 px-4 font-black text-center">Settlement Status</th>
                <th className="py-3 px-4 font-black">Primary Reason</th>
                <th className="py-3 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <RotateCcw className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className={`text-sm font-bold ${textTitle}`}>No Purchase Returns Found</p>
                    <p className={`text-xs ${textSub} mt-0.5`}>
                      {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria or filters.' : 'Click "Create Debit Note Return" to record goods sent back to vendor.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                  const rNum = ret.returnNumber || ret.return_number || ret.id;
                  const sName = ret.supplierName || ret.supplier_name || 'Vendor';
                  const pNum = ret.purchaseNumber || ret.purchase_number || 'Direct';
                  const tot = Number(ret.totalAmount || ret.total_amount) || 0;
                  const rStatus = ret.refundStatus || ret.refund_status || 'Credit Note';
                  const unitCount = (ret.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                  const dateDisplay = ret.createdAt || ret.created_at || '—';

                  return (
                    <tr
                      key={ret.id}
                      className={`hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-black text-amber-600 dark:text-amber-400">
                        {rNum}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateDisplay}
                      </td>
                      <td className="py-3 px-4 font-bold truncate max-w-[180px]">
                        {sName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {pNum}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20">
                          -{unitCount} units
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-right whitespace-nowrap">
                        {formatTZS(tot)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            rStatus === 'Credit Note'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : rStatus === 'Refunded'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {rStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                        {ret.reason || 'Vendor Return'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForView(ret)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-all"
                            title="View Debit Note Voucher"
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

      {/* MODAL: Create Debit Note Return */}
      {isNewReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base sm:text-lg font-black tracking-tight ${textTitle}`}>Create Purchase Return (Debit Note)</h2>
                  <p className={`text-xs ${textSub}`}>Return defective or overstock goods to vendor and adjust inventory</p>
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
              {/* Reference & Supplier Selection */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5`}>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Supplier & Reference Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Link to Purchase Order (Optional)</label>
                    <select
                      value={selectedPurchaseId}
                      onChange={(e) => handleSelectPurchase(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="">-- Manual / Direct Vendor Return --</option>
                      {purchases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.purchaseNumber || p.purchase_number} - {p.supplierName || p.supplier_name} ({formatTZS(p.totalAmount || p.total_amount || 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Supplier / Vendor Name *</label>
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Samsung East Africa, LG Distributor..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>
                </div>
              </div>

              {/* Items to Return */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5`}>
                  <PackageMinus className="w-3.5 h-3.5" />
                  <span>Select Products to Return</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Product *</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find((pr) => pr.id === e.target.value);
                        if (p) {
                          setItemUnitCost(Number(p.costPrice) || Number((p as any).cost_price) || 0);
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="">-- Choose Product from Inventory --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (In Stock: {p.stock ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Unit Cost (TZS) *</label>
                    <input
                      type="number"
                      min="0"
                      value={itemUnitCost || ''}
                      onChange={(e) => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Specific Defect</label>
                    <input
                      type="text"
                      value={itemReason}
                      onChange={(e) => setItemReason(e.target.value)}
                      placeholder="Reason..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItemToReturn}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center transition-all shadow-xs"
                      title="Add to return items"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Return Items Table */}
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'}`}>
                        <th className="py-2.5 px-3 font-bold">Product</th>
                        <th className="py-2.5 px-3 font-bold text-center">Return Qty</th>
                        <th className="py-2.5 px-3 font-bold text-right">Debit Cost</th>
                        <th className="py-2.5 px-3 font-bold text-right">Debit Total</th>
                        <th className="py-2.5 px-3 font-bold">Reason</th>
                        <th className="py-2.5 px-3 font-bold text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {returnItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No products added to return yet. Select a product and click (+) to add.
                          </td>
                        </tr>
                      ) : (
                        returnItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-bold truncate max-w-[220px]">{item.productName}</td>
                            <td className="py-2.5 px-3 text-center font-black text-red-500">-{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatTZS(item.unitCost)}</td>
                            <td className="py-2.5 px-3 text-right font-black">{formatTZS(item.totalRefund)}</td>
                            <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]">{item.reason}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
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
                          <td colSpan={3} className="py-2.5 px-3 text-right">Total Debit Amount:</td>
                          <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-mono text-sm">
                            {formatTZS(returnGrandTotal)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Settlement & Reason */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5`}>
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Debit Settlement & Terms</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Settlement Type</label>
                    <select
                      value={refundStatus}
                      onChange={(e) => setRefundStatus(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="Credit Note">Credit Note (Deducted from upcoming invoice)</option>
                      <option value="Refunded">Direct Cash / Bank Refund Received</option>
                      <option value="Pending">Pending Vendor Inspection & Approval</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Primary Return Reason</label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Broken screen, factory warranty claim, expired lot..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Additional Observations / Supplier RMA Notes</label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Enter manufacturer RMA ticket #, return consignment tracking, or courier info..."
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
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Debit Note...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Deduct Inventory Stock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View & Print Debit Note */}
      {selectedReturnForView && (
        <>
          {typeof document !== 'undefined' &&
            createPortal(
              <div className="ge-doc-print-portal hidden print:block bg-white text-slate-900" aria-hidden="true">
                {renderDebitNoteSheet(selectedReturnForView)}
              </div>,
              document.body
            )}

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
            <div className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 no-print shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <h3 className={`text-sm font-black ${textTitle}`}>
                    Vendor Debit Note: {selectedReturnForView.returnNumber || selectedReturnForView.return_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintDebitNote}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Debit Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReturnForView(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 dark:bg-slate-950/70 custom-scrollbar">
                {renderDebitNoteSheet(selectedReturnForView)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
