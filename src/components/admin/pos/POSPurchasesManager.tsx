import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Purchase, PurchaseItem, Product, StoreSettings, BRAND_LOGO_URL } from '../../../types';
import {
  PackagePlus,
  Search,
  Filter,
  Plus,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  Receipt,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { customConfirm } from '../../../utils/dialog';

export interface POSPurchasesManagerProps {
  purchases: Purchase[];
  products: Product[];
  storeSettings: StoreSettings;
  onAddPurchase: (purchase: Purchase) => Promise<void> | void;
  onUpdatePurchase?: (purchase: Purchase) => Promise<void> | void;
  onDeletePurchase?: (purchaseId: string) => Promise<void> | void;
  onUpdateProduct: (product: Product) => Promise<void> | void;
  onSwitchToRegister: () => void;
  onSwitchToPurchaseReturns?: () => void;
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

export const POSPurchasesManager: React.FC<POSPurchasesManagerProps> = ({
  purchases = [],
  products = [],
  storeSettings,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onUpdateProduct,
  onSwitchToRegister,
  onSwitchToPurchaseReturns,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Partial' | 'Unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState<Purchase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Purchase Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  // Item Search in New Purchase Modal
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(0);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        if (statusFilter !== 'all' && (p.paymentStatus || p.payment_status) !== statusFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const pNum = (p.purchaseNumber || p.purchase_number || '').toLowerCase();
          const sName = (p.supplierName || p.supplier_name || '').toLowerCase();
          const inv = (p.invoiceNumber || p.invoice_number || '').toLowerCase();
          const hasMatchingItem = (p.items || []).some((it) => it.productName?.toLowerCase().includes(q));
          if (!pNum.includes(q) && !sName.includes(q) && !inv.includes(q) && !hasMatchingItem) {
            return false;
          }
        }

        if (dateFilter !== 'all') {
          const dateStr = p.createdAt || p.created_at || '';
          const pDate = new Date(dateStr);
          const now = new Date();
          if (dateFilter === 'today') {
            const todayStr = now.toISOString().slice(0, 10);
            if (!dateStr.startsWith(todayStr)) return false;
          } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (pDate < weekAgo) return false;
          } else if (dateFilter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (pDate < monthAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [purchases, statusFilter, searchTerm, dateFilter]);

  // Aggregate statistics
  const totalPurchasesAmount = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.totalAmount || p.total_amount) || 0), 0);
  }, [purchases]);

  const totalUnitsPurchased = useMemo(() => {
    return purchases.reduce((acc, p) => {
      const itemCount = (p.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      return acc + itemCount;
    }, 0);
  }, [purchases]);

  const unpaidPurchasesBalance = useMemo(() => {
    return purchases.reduce((acc, p) => {
      const tot = Number(p.totalAmount || p.total_amount) || 0;
      const paid = Number(p.paidAmount || p.paid_amount) || 0;
      return acc + Math.max(0, tot - paid);
    }, 0);
  }, [purchases]);

  // Handle adding an item to the purchase line items
  const handleAddItemToPurchase = () => {
    if (!selectedProductId) {
      showAlert('Product Required', 'Please select a product from the catalog.', 'error');
      return;
    }
    const product = products.find((pr) => pr.id === selectedProductId);
    if (!product) return;

    if (itemQuantity <= 0) {
      showAlert('Invalid Quantity', 'Quantity must be at least 1.', 'error');
      return;
    }

    const unitCost = Number(itemUnitCost) >= 0 ? Number(itemUnitCost) : (Number(product.costPrice) || 0);
    const existingIndex = purchaseItems.findIndex((it) => it.productId === product.id);

    if (existingIndex >= 0) {
      const updated = [...purchaseItems];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        unitCost,
        totalCost: newQty * unitCost,
      };
      setPurchaseItems(updated);
    } else {
      const newItem: PurchaseItem = {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        quantity: itemQuantity,
        unitCost,
        totalCost: itemQuantity * unitCost,
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }

    // Reset line item inputs
    setSelectedProductId('');
    setItemSearchTerm('');
    setItemQuantity(1);
    setItemUnitCost(0);
  };

  const handleRemoveItem = (index: number) => {
    const updated = purchaseItems.filter((_, i) => i !== index);
    setPurchaseItems(updated);
  };

  const purchaseGrandTotal = useMemo(() => {
    return purchaseItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
  }, [purchaseItems]);

  const handleOpenNewModal = () => {
    setSupplierName('');
    setSupplierPhone('');
    setSupplierEmail('');
    setInvoiceNumber(`SUP-INV-${Math.floor(10000 + Math.random() * 90000)}`);
    setPaymentStatus('Paid');
    setPaidAmount(0);
    setPaymentMethod('Bank Transfer');
    setPurchaseNotes('');
    setPurchaseItems([]);
    setSelectedProductId('');
    setItemSearchTerm('');
    setItemQuantity(1);
    setItemUnitCost(0);
    setIsNewPurchaseModalOpen(true);
  };

  // Submit and save new purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showAlert('Missing Supplier', 'Please enter the supplier or vendor name.', 'error');
      return;
    }

    if (purchaseItems.length === 0) {
      showAlert('No Items', 'Please add at least one product item to the purchase.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const purchaseId = `po-${Date.now()}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const generatedPurchaseNumber = `PO-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(4, '0')}`;
      const actualPaid = paymentStatus === 'Paid' ? purchaseGrandTotal : paymentStatus === 'Unpaid' ? 0 : paidAmount;

      const newPurchase: Purchase = {
        id: purchaseId,
        purchaseNumber: generatedPurchaseNumber,
        purchase_number: generatedPurchaseNumber,
        supplierName: supplierName.trim(),
        supplier_name: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || undefined,
        supplier_phone: supplierPhone.trim() || undefined,
        supplierEmail: supplierEmail.trim() || undefined,
        supplier_email: supplierEmail.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        items: purchaseItems,
        totalAmount: purchaseGrandTotal,
        total_amount: purchaseGrandTotal,
        paidAmount: actualPaid,
        paid_amount: actualPaid,
        paymentStatus,
        payment_status: paymentStatus,
        paymentMethod,
        payment_method: paymentMethod,
        notes: purchaseNotes.trim() || undefined,
        status: 'Received',
        receivedBy: activeCashierName,
        received_by: activeCashierName,
        createdAt: nowStr,
        created_at: nowStr,
        updatedAt: nowStr,
        updated_at: nowStr,
      };

      await onAddPurchase(newPurchase);

      // Increment product stocks and update cost prices
      for (const it of purchaseItems) {
        const prod = products.find((p) => p.id === it.productId);
        if (prod) {
          const currentStock = Number(prod.stock) || 0;
          const newStock = currentStock + it.quantity;
          const updatedCost = it.unitCost > 0 ? it.unitCost : prod.costPrice;
          const updatedProd: Product = {
            ...prod,
            stock: newStock,
            costPrice: updatedCost,
          };
          (updatedProd as any).cost_price = updatedCost;
          await onUpdateProduct(updatedProd);
        }
      }

      setIsNewPurchaseModalOpen(false);
      setSelectedPurchaseForView(newPurchase);
      showAlert('Purchase Recorded', `Purchase order ${generatedPurchaseNumber} recorded successfully. Inventory stock updated!`, 'success');
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      showAlert('Save Error', err?.message || 'Failed to record stock purchase.', 'error');
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

  const handlePrintVoucher = () => {
    document.body.classList.add('ge-printing-doc');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('ge-printing-doc');
    }, 1500);
  };

  const renderPurchaseVoucherSheet = (purchase: Purchase) => {
    const rawDate = purchase.createdAt || purchase.created_at;
    const formattedDate = rawDate ? formatToGMT3(rawDate) : '—';
    const refNumber = purchase.purchaseNumber || purchase.purchase_number || purchase.id;
    const sName = purchase.supplierName || purchase.supplier_name || 'Vendor';
    const sPhone = purchase.supplierPhone || purchase.supplier_phone;
    const sEmail = purchase.supplierEmail || purchase.supplier_email;
    const invRef = purchase.invoiceNumber || purchase.invoice_number || 'N/A';
    const receiver = purchase.receivedBy || purchase.received_by || 'Staff';
    const pMethod = purchase.paymentMethod || purchase.payment_method || 'Cash';
    const pStatus = purchase.paymentStatus || purchase.payment_status || 'Paid';
    const totalAmt = Number(purchase.totalAmount || purchase.total_amount) || 0;

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
            <div className="inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-900 border-2 border-indigo-700">
              Goods Received Note (GRN)
            </div>
            <p className="font-mono font-black text-base text-slate-900 mt-1.5">{refNumber}</p>
            <p className="text-[10px] text-slate-600 font-medium">Received: {formattedDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-300 keep-together">
          <div>
            <span className="font-black text-slate-500 block text-[10px] uppercase tracking-wider">SUPPLIER / VENDOR:</span>
            <span className="font-black text-sm text-slate-900 block mt-0.5">{sName}</span>
            {sPhone && <span className="block text-slate-700">Tel: {sPhone}</span>}
            {sEmail && <span className="block text-slate-700">{sEmail}</span>}
          </div>

          <div className="text-right space-y-0.5">
            <span className="font-black text-slate-500 block text-[10px] uppercase tracking-wider">CONSIGNMENT DETAILS:</span>
            <span className="block text-slate-700">
              Supplier Inv: <strong className="font-mono text-slate-900">{invRef}</strong>
            </span>
            <span className="block text-slate-700">
              Receiver: <strong className="text-slate-900">{receiver}</strong>
            </span>
            <span className="block text-slate-700">
              Payment Status: <strong className="text-slate-900">{pStatus}</strong>
            </span>
          </div>
        </div>

        <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black">
                <th className="p-2.5 w-9 text-center">#</th>
                <th className="p-2.5">Item Description</th>
                <th className="p-2.5 text-center">Inward Qty</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-right">Total (TZS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(purchase.items || []).map((it, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-bold text-slate-900">{it.productName}</td>
                  <td className="p-2.5 text-center font-black text-emerald-700">+{it.quantity}</td>
                  <td className="p-2.5 text-right text-slate-800">{formatTZS(it.unitCost)}</td>
                  <td className="p-2.5 text-right font-black text-slate-900">{formatTZS(it.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-900">
                <td colSpan={4} className="p-2.5 text-right text-slate-900 uppercase">Grand Total Consignment:</td>
                <td className="p-2.5 text-right text-indigo-900 font-mono text-sm">
                  {formatTZS(totalAmt)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 border border-slate-300 keep-together">
          <div>
            <span className="font-bold text-slate-600">Payment Method: </span>
            <span className="font-extrabold text-slate-900">{pMethod}</span>
          </div>
          <div>
            <span className="font-bold text-slate-600">Settlement Status: </span>
            <span className={`font-black uppercase px-2 py-0.5 rounded border ${
              pStatus === 'Paid'
                ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                : pStatus === 'Partial'
                ? 'text-amber-800 bg-amber-100 border-amber-300'
                : 'text-red-800 bg-red-100 border-red-300'
            }`}>
              {pStatus}
            </span>
          </div>
        </div>

        {purchase.notes && (
          <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 text-[11px] text-slate-700 italic keep-together">
            <strong className="not-italic text-slate-900">Notes:</strong> {purchase.notes}
          </div>
        )}

        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs keep-together">
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-black text-slate-900">Delivered by Vendor Driver / Agent</p>
            <p className="text-[10px] text-slate-500">Signature & Date</p>
          </div>
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-black text-slate-900">Verified & Received by {storeSettings?.storeName || 'Genuine Electronics'}</p>
            <p className="text-[10px] text-slate-500">Warehouse In-charge Signature</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Actions Header */}
      <div className={`p-5 rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 shadow-xs`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black tracking-tight ${textTitle}`}>Supplier Purchases & Stock Inward</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Goods Received Notes
                </span>
              </div>
              <p className={`text-xs ${textSub} mt-0.5`}>
                Record inventory restocking from vendors, update cost prices, and track supplier invoices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onSwitchToPurchaseReturns && (
              <button
                type="button"
                onClick={onSwitchToPurchaseReturns}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>Purchase Returns</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Record Stock Purchase</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Total Purchases Value</span>
            <span className={`text-lg font-black tracking-tight ${textTitle} block mt-0.5`}>
              {formatTZS(totalPurchasesAmount)}
            </span>
            <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> {purchases.length} Total Invoices
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Total Inward Units</span>
            <span className={`text-lg font-black tracking-tight text-emerald-500 block mt-0.5`}>
              {totalUnitsPurchased.toLocaleString()} Pcs
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Added to store shelf inventory</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Unpaid Supplier Balance</span>
            <span className={`text-lg font-black tracking-tight ${unpaidPurchasesBalance > 0 ? 'text-amber-500' : 'text-slate-400'} block mt-0.5`}>
              {formatTZS(unpaidPurchasesBalance)}
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Credit & partial supplier accounts</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-bold ${textSub} block`}>Active Products in Catalog</span>
            <span className={`text-lg font-black tracking-tight text-blue-500 block mt-0.5`}>
              {products.length} Products
            </span>
            <span className={`text-[10px] ${textSub} block mt-1`}>Available for supplier consignment</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier, invoice #, PO #, item..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {(['all', 'Paid', 'Partial', 'Unpaid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Date Filter */}
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

      {/* Purchases List Table */}
      <div className={`rounded-2xl border ${cardBg} border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <th className="py-3 px-4 font-black">Purchase #</th>
                <th className="py-3 px-4 font-black">Date & Time</th>
                <th className="py-3 px-4 font-black">Supplier / Vendor</th>
                <th className="py-3 px-4 font-black">Invoice Ref</th>
                <th className="py-3 px-4 font-black">Items</th>
                <th className="py-3 px-4 font-black text-right">Total Cost</th>
                <th className="py-3 px-4 font-black text-center">Payment Status</th>
                <th className="py-3 px-4 font-black">Received By</th>
                <th className="py-3 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <PackagePlus className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className={`text-sm font-bold ${textTitle}`}>No Purchases Found</p>
                    <p className={`text-xs ${textSub} mt-0.5`}>
                      {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria or filters.' : 'Click "Record Stock Purchase" to log your first supplier delivery.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const pNum = purchase.purchaseNumber || purchase.purchase_number || purchase.id;
                  const sName = purchase.supplierName || purchase.supplier_name || 'Vendor';
                  const inv = purchase.invoiceNumber || purchase.invoice_number || '—';
                  const tot = Number(purchase.totalAmount || purchase.total_amount) || 0;
                  const pStatus = purchase.paymentStatus || purchase.payment_status || 'Paid';
                  const itemCount = (purchase.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                  const dateDisplay = purchase.createdAt || purchase.created_at || '—';

                  return (
                    <tr
                      key={purchase.id}
                      className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {pNum}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateDisplay}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold block truncate max-w-[180px]">{sName}</span>
                        {(purchase.supplierPhone || purchase.supplier_phone) && (
                          <span className="text-[10px] text-slate-400 block">{purchase.supplierPhone || purchase.supplier_phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {inv}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {itemCount} units ({purchase.items?.length || 0} items)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-right whitespace-nowrap">
                        {formatTZS(tot)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            pStatus === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : pStatus === 'Partial'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {pStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                        {purchase.receivedBy || purchase.received_by || 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPurchaseForView(purchase)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-all"
                            title="View Goods Received Voucher"
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

      {/* MODAL: Record New Stock Purchase */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base sm:text-lg font-black tracking-tight ${textTitle}`}>Record Stock Purchase</h2>
                  <p className={`text-xs ${textSub}`}>Goods Inward voucher & inventory stock replenishment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Supplier Info */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5`}>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Supplier & Invoice Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Supplier Phone</label>
                    <input
                      type="text"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="+255..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Supplier Invoice / Ref #</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-2026-99"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>
                </div>
              </div>

              {/* Add Items Section */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5`}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Received Products</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Select Product from Catalog *</label>
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
                      <option value="">-- Choose Product to Restock --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock ?? 0})
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

                  <div className="sm:col-span-3">
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Unit Cost (TZS) *</label>
                    <input
                      type="number"
                      min="0"
                      value={itemUnitCost || ''}
                      onChange={(e) => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Unit cost in TZS..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputBg} border-slate-200 dark:border-slate-700`}
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItemToPurchase}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center transition-all shadow-xs"
                      title="Add to consignment"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items List Table */}
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'}`}>
                        <th className="py-2.5 px-3 font-bold">Product Name</th>
                        <th className="py-2.5 px-3 font-bold text-center">Qty Received</th>
                        <th className="py-2.5 px-3 font-bold text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 font-bold text-right">Line Total</th>
                        <th className="py-2.5 px-3 font-bold text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {purchaseItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No products added yet. Select a product and click (+) to add.
                          </td>
                        </tr>
                      ) : (
                        purchaseItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-bold truncate max-w-[260px]">{item.productName}</td>
                            <td className="py-2.5 px-3 text-center font-black text-indigo-500">+{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatTZS(item.unitCost)}</td>
                            <td className="py-2.5 px-3 text-right font-black">{formatTZS(item.totalCost)}</td>
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
                    {purchaseItems.length > 0 && (
                      <tfoot>
                        <tr className={`border-t font-black ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                          <td colSpan={3} className="py-2.5 px-3 text-right">Grand Total Cost:</td>
                          <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                            {formatTZS(purchaseGrandTotal)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Payment & Settlement */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h3 className={`text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5`}>
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Payment Settlement</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="Paid">Fully Paid</option>
                      <option value="Partial">Partial Payment</option>
                      <option value="Unpaid">Unpaid (Supplier Credit)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="Bank Transfer">Bank Transfer (CRDB/NMB)</option>
                      <option value="Mobile Money">Mobile Money (M-Pesa/Airtel)</option>
                      <option value="Cash">Cash at Warehouse</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Supplier Credit">Supplier Credit Terms</option>
                    </select>
                  </div>

                  {paymentStatus === 'Partial' && (
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Amount Paid Now (TZS)</label>
                      <input
                        type="number"
                        min="0"
                        max={purchaseGrandTotal}
                        value={paidAmount || ''}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Amount paid..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-black ${inputBg} border-slate-200 dark:border-slate-700`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Notes / Consignment Observations</label>
                  <textarea
                    rows={2}
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    placeholder="Enter delivery batch details, warranty certificates, or driver details..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg} border-slate-200 dark:border-slate-700`}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || purchaseItems.length === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Stock & Inward...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Update Inventory Stock</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View & Print Goods Received Note / Purchase Voucher */}
      {selectedPurchaseForView && (
        <>
          {typeof document !== 'undefined' &&
            createPortal(
              <div className="ge-doc-print-portal hidden print:block bg-white text-slate-900" aria-hidden="true">
                {renderPurchaseVoucherSheet(selectedPurchaseForView)}
              </div>,
              document.body
            )}

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
            <div className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl ${modalBg} border-slate-200 dark:border-slate-800 overflow-hidden`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 no-print shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-500" />
                  <h3 className={`text-sm font-black ${textTitle}`}>
                    Goods Received Note: {selectedPurchaseForView.purchaseNumber || selectedPurchaseForView.purchase_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintVoucher}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPurchaseForView(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 dark:bg-slate-950/70 custom-scrollbar">
                {renderPurchaseVoucherSheet(selectedPurchaseForView)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
