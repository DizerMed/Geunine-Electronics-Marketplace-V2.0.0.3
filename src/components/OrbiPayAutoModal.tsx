import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Order, OrderItem, OrbiPaymentIntent, POSTransaction } from '../types';

export interface OrbiPayAutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  items?: OrderItem[];
  receiptDraft?: Record<string, any>;
  formatTZS: (val: number) => string;
  isDark: boolean;
  onAutoCompleted: (payload: {
    intent: OrbiPaymentIntent;
    order?: Order | null;
    posTransaction?: POSTransaction | null;
  }) => void;
}

export const OrbiPayAutoModal: React.FC<OrbiPayAutoModalProps> = ({
  isOpen,
  onClose,
  amount,
  orderId,
  customerName,
  customerPhone,
  cashierName,
  items = [],
  receiptDraft,
  formatTZS,
  isDark,
  onAutoCompleted,
}) => {
  const [intent, setIntent] = useState<OrbiPaymentIntent | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>(customerPhone || '');
  const [isInitiating, setIsInitiating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [completedState, setCompletedState] = useState<{
    intent: OrbiPaymentIntent;
    order?: Order | null;
    posTransaction?: POSTransaction | null;
  } | null>(null);

  const hasFiredCallbackRef = useRef(false);
  const onAutoCompletedRef = useRef(onAutoCompleted);
  onAutoCompletedRef.current = onAutoCompleted;

  const triggerAutoCompletedOnce = (payload: {
    intent: OrbiPaymentIntent;
    order?: Order | null;
    posTransaction?: POSTransaction | null;
  }) => {
    if (hasFiredCallbackRef.current) return;
    hasFiredCallbackRef.current = true;
    setCompletedState(payload);
    setTimeout(() => {
      onAutoCompletedRef.current(payload);
    }, 650);
  };

  const initiateOrbiPayment = async (overridePhone?: string) => {
    if (amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    setIsInitiating(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/orbi-pay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          orderId,
          customerPhone: overridePhone ?? phoneInput,
          customerName,
          cashierName,
          items,
          receiptDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.intent) {
        throw new Error(data?.error || 'Could not start Orbi Pay session.');
      }
      setIntent(data.intent);
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate Orbi Pay.');
    } finally {
      setIsInitiating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIntent(null);
      setError(null);
      setCompletedState(null);
      setIsInitiating(false);
      setIsConfirming(false);
      hasFiredCallbackRef.current = false;
      return;
    }
    hasFiredCallbackRef.current = false;
    setCompletedState(null);
    setPhoneInput(customerPhone || '');
    initiateOrbiPayment(customerPhone || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId, amount]);

  // Listen to SSE ORBI_PAYMENT_COMPLETED events + poll status while PENDING
  useEffect(() => {
    if (!isOpen || !intent?.paymentRef || intent.status === 'PAID' || hasFiredCallbackRef.current) {
      return;
    }

    const activeRef = intent.paymentRef;

    const handleLiveEvent = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail?.type === 'ORBI_PAYMENT_COMPLETED' && detail?.paymentRef === activeRef) {
        triggerAutoCompletedOnce({
          intent: { ...intent, status: 'PAID', posTransactionId: detail?.posTransaction?.id },
          order: detail?.order || null,
          posTransaction: detail?.posTransaction || null,
        });
      }
    };

    window.addEventListener('cloud-live-event', handleLiveEvent);

    const pollInterval = setInterval(async () => {
      if (hasFiredCallbackRef.current) return;
      try {
        const res = await fetch(`/api/payments/orbi-pay/status/${encodeURIComponent(activeRef)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.intent?.status === 'PAID') {
          triggerAutoCompletedOnce({
            intent: data.intent,
            order: data.order || null,
            posTransaction: data.posTransaction || null,
          });
        } else if (data?.intent?.status === 'FAILED' || data?.intent?.status === 'EXPIRED') {
          setError(`Orbi Pay payment ${data.intent.status.toLowerCase()}. Please generate a new payment request.`);
          setIntent(data.intent);
        }
      } catch {
        // ignore transient polling failure
      }
    }, 2500);

    return () => {
      window.removeEventListener('cloud-live-event', handleLiveEvent);
      clearInterval(pollInterval);
    };
  }, [isOpen, intent]);

  const handleConfirmAndAutoComplete = async () => {
    if (!intent?.paymentRef || isConfirming) return;
    setIsConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/orbi-pay/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef: intent.paymentRef }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not verify Orbi Pay settlement.');
      }
      if (data?.intent?.status === 'PAID') {
        triggerAutoCompletedOnce({
          intent: data.intent,
          order: data.order || null,
          posTransaction: data.posTransaction || null,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  const surfaceBg = isDark
    ? 'bg-slate-900 border-slate-700/80 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputStyle = isDark
    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className={`max-w-md w-full rounded-3xl border shadow-2xl overflow-hidden ${surfaceBg}`}>
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">Orbi Pay Auto-Complete</h3>
                {intent?.mode && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white tracking-wider">
                    {intent.mode === 'live' ? 'LIVE GATEWAY' : 'INSTANT COUNTER'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80">
                {orderId ? `Settling Order #${orderId}` : 'Automated POS Checkout & Receipt'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount & Customer Summary */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${subText}`}>Total Payable</span>
              <div className="text-2xl font-black text-indigo-500">{formatTZS(amount)}</div>
              {customerName && (
                <div className={`text-[11px] font-semibold mt-0.5 ${subText}`}>
                  Customer: <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{customerName}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold uppercase block ${subText}`}>Merchant ID</span>
              <span className="font-mono text-xs font-black px-2 py-1 rounded-lg bg-purple-500/15 text-purple-500 border border-purple-500/25 inline-block mt-1">
                {intent?.merchantId || 'ORBI-9901'}
              </span>
            </div>
          </div>

          {completedState ? (
            <div className="py-6 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-black text-emerald-500">Payment Verified & Auto-Completed!</h4>
              <p className={`text-xs ${subText}`}>
                Ref <span className="font-mono font-bold">{completedState.intent.paymentRef}</span> settled. Generating official receipt...
              </p>
            </div>
          ) : isInitiating ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className={`text-xs font-semibold ${subText}`}>Creating encrypted Orbi Pay payment intent...</p>
            </div>
          ) : intent ? (
            <>
              {/* QR Code Presentation */}
              <div className={`p-4 rounded-2xl border flex flex-col items-center gap-3 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-indigo-50/40 border-indigo-200/70'}`}>
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                  <QRCodeSVG value={intent.qrPayload} size={156} level="M" />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span className={`font-bold ${subText}`}>Ref:</span>
                  <span className="font-mono font-black tracking-wide">{intent.paymentRef}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(intent.paymentRef);
                      setCopiedRef(true);
                      setTimeout(() => setCopiedRef(false), 1800);
                    }}
                    className="p-1 rounded-lg hover:bg-indigo-500/15 text-indigo-500 transition-colors"
                    title="Copy Payment Reference"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Listening for Orbi Pay auto-completion...</span>
                </div>
              </div>

              {/* Optional Customer Wallet / Phone Push */}
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold flex items-center gap-1.5 ${subText}`}>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Customer Phone / Orbi Wallet Number</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. +255 7XX XXX XXX"
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputStyle}`}
                  />
                  <button
                    type="button"
                    onClick={() => initiateOrbiPayment(phoneInput)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-500 border border-indigo-500/30 transition-all shrink-0 flex items-center gap-1"
                    title="Generate fresh Orbi Pay QR & prompt"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Footer Actions */}
          {!completedState && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>

              {intent ? (
                <button
                  type="button"
                  disabled={isConfirming || isInitiating}
                  onClick={handleConfirmAndAutoComplete}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isConfirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {intent.mode === 'live'
                      ? 'Verify Orbi Pay & Auto-Complete'
                      : 'Complete Orbi Pay Payment'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isInitiating}
                  onClick={() => initiateOrbiPayment()}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Orbi Pay</span>
                </button>
              )}
            </div>
          )}

          <div className={`flex items-center justify-center gap-1.5 text-[10px] ${subText}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Auto-updates order status, stock inventory & thermal receipt once settled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
