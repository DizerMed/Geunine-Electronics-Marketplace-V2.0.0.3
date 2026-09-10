import React from 'react';
import { formatTZS, Product } from '../types';
import {
  ShoppingCart, CheckCircle, X, CreditCard, User, AlertTriangle,
  Printer, Banknote, Tag, Sparkles, Calendar, Phone,
  Layers, FileText, ArrowRight, ShieldCheck
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { groupCartItemsByTaxStatus } from '../utils/taxUtils';

interface POSSalePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cart: { product: Product; quantity: number; price?: number }[];
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  paymentReference?: string;
  isSplitMode: boolean;
  splitPayments: { method: string; amount: number; reference?: string }[];
  tenderedAmount: number;
  changeAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerTin?: string;
  isLoan: boolean;
  loanDownPayment: number;
  loanDueDate?: string;
  loanNationalId?: string;
  loanGuarantorName?: string;
  loanGuarantorPhone?: string;
  extraCosts?: { name: string; amount: number }[];
  isDark: boolean;
  getPosItemUnitPrice: (item: any) => number;
  onUpdateTenderedAmount?: (amount: number) => void;
  onApplyDiscount?: (additionalDiscount: number) => void;
  onConvertToLoan?: (downPayment: number) => void;
}

export const POSSalePreviewModal: React.FC<POSSalePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cart,
  total,
  subtotal,
  discount,
  tax,
  paymentMethod,
  paymentReference,
  isSplitMode,
  splitPayments = [],
  tenderedAmount,
  changeAmount,
  customerName,
  customerPhone,
  customerEmail,
  customerTin,
  isLoan,
  loanDownPayment,
  loanDueDate,
  loanNationalId,
  loanGuarantorName,
  loanGuarantorPhone,
  extraCosts = [],
  isDark,
  getPosItemUnitPrice,
  onUpdateTenderedAmount,
  onApplyDiscount,
  onConvertToLoan,
}) => {
  if (!isOpen) return null;

  const taxAnalysis = groupCartItemsByTaxStatus(cart, {
    discount,
    includeVat: tax > 0,
  });

  const grossCartTotal = cart.reduce((sum, item) => sum + getPosItemUnitPrice(item) * item.quantity, 0);

  // Compute actual received / allocated payment
  const activeSplits = splitPayments.filter(p => Number(p.amount) > 0);
  const totalSplitAllocated = splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const effectiveAllocated = isSplitMode
    ? totalSplitAllocated
    : isLoan
      ? (loanDownPayment || 0)
      : (paymentMethod === 'Cash' && tenderedAmount > 0 ? tenderedAmount : total);

  // Calculate shortage (strictly for non-loan sales)
  const isShortage = !isLoan && effectiveAllocated < total;
  const shortageAmount = isShortage ? total - effectiveAllocated : 0;

  // Calculate change due
  const effectiveChange = isSplitMode
    ? (totalSplitAllocated > total ? totalSplitAllocated - total : 0)
    : (paymentMethod === 'Cash' && tenderedAmount > total ? tenderedAmount - total : changeAmount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl mx-auto rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${
        isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
      }`}>
        
        {/* Header */}
        <div className={`shrink-0 px-6 py-4 flex items-center justify-between border-b ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isLoan
                ? 'bg-amber-500/10 text-amber-500'
                : isShortage
                  ? 'bg-rose-500/10 text-rose-500'
                  : 'bg-emerald-500/10 text-emerald-500'
            }`}>
              {isLoan ? <Banknote className="w-5 h-5" /> : isShortage ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Review Sale Details</h2>
                {isLoan ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Credit / Loan Sale
                  </span>
                ) : isSplitMode ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                    Split Tender
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    Standard Sale
                  </span>
                )}
              </div>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Verify customer details, payment allocations, and terms before printing receipt
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">

          {/* CRITICAL: Payment Shortage Resolution Card */}
          {isShortage && (
            <div className={`p-4 rounded-2xl border-2 animate-pulse-slow ${
              isDark
                ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm">Payment Shortage Detected: Short by {formatTZS(shortageAmount)}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500 text-white">Action Required</span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      The customer has tendered <span className="font-black">{formatTZS(effectiveAllocated)}</span> out of the required <span className="font-black">{formatTZS(total)}</span>. 
                      Standard sales cannot be completed with an unpaid balance. Please select one of the following resolution actions:
                    </p>
                  </div>

                  {/* Resolution Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        onApplyDiscount?.(shortageAmount);
                      }}
                      className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-left transition-all group flex items-start gap-2.5"
                    >
                      <Tag className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs font-black flex items-center gap-1">
                          <span>Apply Shortage as Discount</span>
                          <span className="text-[10px] text-amber-500">(-{formatTZS(shortageAmount)})</span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Adjust total payable to {formatTZS(effectiveAllocated)} so the sale is 100% paid.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        onConvertToLoan?.(effectiveAllocated);
                      }}
                      className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-800 dark:text-purple-200 text-left transition-all group flex items-start gap-2.5"
                    >
                      <CreditCard className="w-4 h-4 text-purple-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs font-black flex items-center gap-1">
                          <span>Convert to Sell by Loan</span>
                          <span className="text-[10px] text-purple-500">(Deni)</span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Set {formatTZS(effectiveAllocated)} as down payment; remaining {formatTZS(shortageAmount)} recorded as debt.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Top Summary: Customer & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Customer Info Card */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer Details</span>
                {customerPhone && <span className="text-emerald-500 font-bold">Contact Saved</span>}
              </div>
              <div className="font-extrabold text-sm truncate">{customerName || 'Walk-in Customer'}</div>
              {customerPhone && (
                <div className={`text-xs mt-1 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{customerPhone}</span>
                </div>
              )}
              {customerTin && (
                <div className={`text-[11px] mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  TIN: {customerTin}
                </div>
              )}
            </div>

            {/* Payment Mode Card */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payment Method</span>
                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                  isLoan
                    ? 'bg-amber-500/15 text-amber-500'
                    : isShortage
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-emerald-500/15 text-emerald-500'
                }`}>
                  {isLoan ? 'Credit Terms' : isShortage ? 'Underpaid' : 'Settled ✓'}
                </span>
              </div>
              <div className="font-extrabold text-sm truncate">
                {isLoan ? 'Sell by Loan (Credit Sale)' : isSplitMode ? 'Split Payment Tender' : paymentMethod}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isLoan ? (
                  <span>Deposit: <strong className="text-emerald-500">{formatTZS(loanDownPayment || 0)}</strong> • Balance: <strong className="text-rose-500">{formatTZS(Math.max(0, total - (loanDownPayment || 0)))}</strong></span>
                ) : isSplitMode ? (
                  <span>{activeSplits.length} method{activeSplits.length !== 1 ? 's' : ''} allocated ({formatTZS(totalSplitAllocated)})</span>
                ) : paymentReference ? (
                  <span className="font-mono text-blue-500 truncate">Ref: {paymentReference}</span>
                ) : (
                  <span>Direct full settlement</span>
                )}
              </div>
            </div>
          </div>

          {/* DYNAMIC PAYMENT BREAKDOWN */}
          {/* Case 1: Split Tender Breakdown */}
          {isSplitMode && (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-purple-950/20 border-purple-900/40' : 'bg-purple-50/60 border-purple-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-purple-900 dark:text-purple-200">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Split Tender Payment Breakdown</span>
                </div>
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                  Allocated: {formatTZS(totalSplitAllocated)}
                </span>
              </div>

              <div className="space-y-1.5">
                {splitPayments.map((split, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      Number(split.amount) > 0
                        ? (isDark ? 'bg-slate-900/80 border-purple-900/50' : 'bg-white border-purple-200')
                        : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60')
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold">{split.method}</span>
                      {split.reference && (
                        <span className="ml-2 font-mono text-[10px] text-purple-600 dark:text-purple-400">
                          Ref: {split.reference}
                        </span>
                      )}
                    </div>
                    <span className={`font-black ml-2 ${Number(split.amount) > 0 ? (isDark ? 'text-white' : 'text-slate-900') : ''}`}>
                      {formatTZS(Number(split.amount) || 0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Split Status Bar */}
              <div className="pt-2 border-t border-purple-200 dark:border-purple-900/40 flex items-center justify-between text-xs font-bold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Total Payable: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{formatTZS(total)}</strong>
                </span>
                <span className={`font-black px-2 py-0.5 rounded-md ${
                  effectiveAllocated >= total
                    ? (effectiveAllocated > total ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')
                    : 'bg-rose-500/15 text-rose-500'
                }`}>
                  {effectiveAllocated >= total
                    ? (effectiveAllocated > total ? `Change Due: ${formatTZS(effectiveAllocated - total)}` : 'Fully Paid ✓')
                    : `Short by ${formatTZS(total - effectiveAllocated)}`}
                </span>
              </div>
            </div>
          )}

          {/* Case 2: Sell by Loan / Credit Terms Breakdown */}
          {isLoan && (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
                  <Banknote className="w-4 h-4 text-amber-500" />
                  <span>Credit & Installment Sale Agreement</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-white">
                  Debt Contract
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-amber-900/50' : 'bg-white border-amber-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Down Payment Received</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatTZS(loanDownPayment || 0)}</span>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/80 border-amber-900/50' : 'bg-white border-amber-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Outstanding Loan Balance</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{formatTZS(Math.max(0, total - (loanDownPayment || 0)))}</span>
                </div>

                <div className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${isDark ? 'bg-slate-900/80 border-amber-900/50' : 'bg-white border-amber-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Repayment Due Date</span>
                  <div className="font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{loanDueDate || '30 Days from Sale'}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${isDark ? 'bg-slate-900/80 border-amber-900/50' : 'bg-white border-amber-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Guarantor / NIN</span>
                  <span className="font-bold truncate block">
                    {loanGuarantorName ? `${loanGuarantorName} (${loanGuarantorPhone || ''})` : (loanNationalId ? `NIN: ${loanNationalId}` : 'Not Provided')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Case 3: Single Cash Tender Details */}
          {!isSplitMode && !isLoan && paymentMethod === 'Cash' && (
            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-200">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span>Physical Cash Register Tender</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Tendered: {formatTZS(effectiveAllocated)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-emerald-100'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Payable</span>
                  <span className="font-black text-sm">{formatTZS(total)}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-emerald-100'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    {effectiveChange > 0 ? 'Change Due to Customer' : (isShortage ? 'Unpaid Shortage' : 'Balance Status')}
                  </span>
                  <span className={`font-black text-sm ${
                    effectiveChange > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isShortage
                        ? 'text-rose-500'
                        : 'text-blue-500'
                  }`}>
                    {effectiveChange > 0
                      ? formatTZS(effectiveChange)
                      : isShortage
                        ? `-${formatTZS(shortageAmount)}`
                        : 'Exact Tender ✓'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase mb-2.5">
              <span className="flex items-center gap-1.5"><ShoppingCart className="w-4 h-4" /> Order Items ({cart.length})</span>
              <span>Total Qty: {cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {cart.map((item, idx) => {
                const isVatItem = item.product?.isVatInclusive !== false;
                const unitPrice = getPosItemUnitPrice(item);
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div key={idx} className={`p-3 flex items-center justify-between text-sm ${
                    idx !== cart.length - 1 ? (isDark ? 'border-b border-slate-800' : 'border-b border-slate-200') : ''
                  }`}>
                    <div className="flex flex-col min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{item.product.name}</span>
                        {isVatItem ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                            VAT Incl.
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.2 rounded border border-slate-500/20 shrink-0">
                            Non-VAT
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.quantity}x @ {formatTZS(unitPrice)}
                      </span>
                    </div>
                    <span className="font-black shrink-0">{formatTZS(lineTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-100/50'}`}>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Subtotal (Gross)</span>
              <span className="font-bold">{formatTZS(grossCartTotal)}</span>
            </div>

            {taxAnalysis.isMixed && tax > 0 ? (
              <>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>• Taxable Subtotal (Net)</span>
                  <span>{formatTZS(taxAnalysis.taxableNetSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>• Non-VAT / Exempt Items</span>
                  <span>{formatTZS(taxAnalysis.exemptSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>• VAT (18% on Taxable Items)</span>
                  <span className="font-semibold">{formatTZS(tax)}</span>
                </div>
              </>
            ) : (
              tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>VAT (Included)</span>
                  <span className="font-bold">{formatTZS(tax)}</span>
                </div>
              )
            )}

            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Discount Applied</span>
                <span>-{formatTZS(discount)}</span>
              </div>
            )}

            {extraCosts.length > 0 && (
              <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-1">
                {extraCosts.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                    <span>+ {c.name}</span>
                    <span className="font-bold">+{formatTZS(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className={`pt-3 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <span className="text-base font-black">Total Payable</span>
              <span className="text-xl font-black text-blue-500">{formatTZS(total)}</span>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400">Amount Tendered / Received:</span>
              <span className="font-black text-slate-900 dark:text-white">{formatTZS(effectiveAllocated)}</span>
            </div>

            {/* Final Balance Line */}
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">
                {isLoan ? 'Loan Balance Due:' : effectiveChange > 0 ? 'Change Due to Customer:' : (isShortage ? 'Unpaid Shortage:' : 'Balance Status:')}
              </span>
              <span className={`font-black ${
                isLoan
                  ? 'text-rose-500'
                  : effectiveChange > 0
                    ? 'text-emerald-500'
                    : isShortage
                      ? 'text-rose-500'
                      : 'text-emerald-500'
              }`}>
                {isLoan
                  ? formatTZS(Math.max(0, total - (loanDownPayment || 0)))
                  : effectiveChange > 0
                    ? `+${formatTZS(effectiveChange)}`
                    : isShortage
                      ? `-${formatTZS(shortageAmount)}`
                      : 'Fully Settled ✓'}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className={`shrink-0 p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center gap-3 ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white'
        }`}>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`w-full sm:w-1/3 py-3.5 rounded-2xl font-bold text-sm transition-all text-center ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            Cancel & Edit
          </button>
          
          <button
            disabled={isShortage}
            onClick={() => {
              if (isShortage) return;
              triggerHaptic('success');
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-2/3 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isShortage
                ? 'bg-slate-600/50 text-slate-400 border border-slate-600/30 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-[0.98]'
            }`}
          >
            {isShortage ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Resolve Shortage Above to Checkout</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 shrink-0" />
                <span>Confirm & Complete Sale</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

