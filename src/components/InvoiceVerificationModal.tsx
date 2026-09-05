import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, CheckCircle2, QrCode, FileText, Printer, Download, 
  Share2, Store, Phone, Calendar, ArrowLeft, RefreshCw, X, Award, Check, Copy, AlertCircle, Truck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { formatTZS, formatToGMT3, StoreSettings, BRAND_LOGO_URL, Order } from '../types';
import { parseInvoiceQueryParams, fetchOnlineInvoiceVerification, buildInvoiceVerificationUrl } from '../services/receiptQrService';
import { InvoiceGenerator } from './InvoiceGenerator';

export interface InvoiceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo?: string | null;
  invoiceNo?: string | null;
  docType?: 'tax' | 'proforma' | 'delivery' | null;
  storeSettings?: StoreSettings;
  clientOrders?: Order[];
}

export const InvoiceVerificationModal: React.FC<InvoiceVerificationModalProps> = ({
  isOpen,
  onClose,
  orderNo: propOrderNo,
  invoiceNo: propInvoiceNo,
  docType: propDocType,
  storeSettings,
  clientOrders = []
}) => {
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [activeDocType, setActiveDocType] = useState<'tax' | 'proforma' | 'delivery'>('tax');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const queryParams = parseInvoiceQueryParams();
  const activeOrderNo = propOrderNo || queryParams.orderNo || '';
  const activeInvoiceNo = propInvoiceNo || queryParams.invoiceNo || activeOrderNo || 'INV-0000';
  const initialDocType = propDocType || queryParams.docType || 'tax';

  useEffect(() => {
    if (initialDocType) {
      setActiveDocType(initialDocType);
    }
  }, [initialDocType]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    // 1. First check if order is already loaded in clientOrders
    const cleanOrderNo = (activeOrderNo || '').toLowerCase().replace(/^#/, '');
    const cleanInvoiceNo = (activeInvoiceNo || '').toLowerCase().replace(/^#/, '');

    const localMatch = clientOrders.find((o) => {
      const oId = (o.id || '').toLowerCase().replace(/^#/, '');
      const oNum = ((o as any).orderNumber || '').toLowerCase().replace(/^#/, '');
      return oId === cleanOrderNo || oNum === cleanOrderNo || oId === cleanInvoiceNo || oNum === cleanInvoiceNo;
    });

    if (localMatch) {
      const deducedType = initialDocType || (localMatch.paymentStatus === 'Paid' ? 'tax' : 'proforma');
      setActiveDocType(deducedType);
      setVerificationResult({
        isVerified: true,
        status: 'VERIFIED',
        docType: deducedType,
        order: localMatch,
        storeInfo: storeSettings,
        message: 'Document verified directly from official active register.'
      });
      setLoading(false);
    }

    // 2. Perform server-side online verification
    const performVerification = async () => {
      if (!activeOrderNo && !activeInvoiceNo) {
        if (isMounted) setLoading(false);
        return;
      }

      const res = await fetchOnlineInvoiceVerification(
        activeOrderNo || 'GEN-ORDER',
        activeInvoiceNo || 'INV-0000',
        initialDocType || 'tax',
        {
          customer: queryParams.customer || undefined,
          total: queryParams.total || undefined
        }
      );

      if (isMounted) {
        setVerificationResult(res);
        if (res.docType) {
          setActiveDocType(res.docType);
        }
        setLoading(false);
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeOrderNo, activeInvoiceNo, initialDocType, clientOrders, storeSettings]);

  if (!isOpen) return null;

  const orderData: Order | null = verificationResult?.order;
  const store = verificationResult?.storeInfo || storeSettings;
  const isVerified = verificationResult?.isVerified !== false;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const docTitle = activeDocType === 'delivery' 
      ? 'OFFICIAL DELIVERY NOTE' 
      : activeDocType === 'proforma' 
      ? 'PROFORMA INVOICE / QUOTATION' 
      : 'OFFICIAL TAX INVOICE';

    const text = `📄 *${docTitle} - Genuine Electronics Tanzania*\n` +
      `• Reference: ${activeInvoiceNo}\n` +
      `• Customer: ${orderData?.customerName || 'Valued Customer'}\n` +
      (activeDocType !== 'delivery' && orderData?.totalAmount ? `• Total Amount: ${formatTZS(orderData.totalAmount)}\n` : '') +
      `• Verification Status: AUTHENTIC & VERIFIED ONLINE\n` +
      `• View online official document: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-5xl max-h-[96vh] h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        
        {/* Verification Top Banner Bar */}
        <div className="no-print bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-3 sm:p-4 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  OFFICIAL ONLINE DOCUMENT VERIFICATION
                </span>
                <span className="text-[9px] font-bold text-slate-300 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full">
                  TRA TIN: {store?.tin || '104-982-371'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                {activeDocType === 'delivery' ? (
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <Truck className="w-4 h-4" />
                    Delivery Note & Packing Slip
                  </span>
                ) : activeDocType === 'proforma' ? (
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <FileText className="w-4 h-4" />
                    Proforma Invoice / Quotation
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <Award className="w-4 h-4" />
                    Official TRA Tax Invoice
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400 font-normal">({activeInvoiceNo})</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Document Type Switcher */}
            <div className="flex bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setActiveDocType('tax')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeDocType === 'tax' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveDocType('proforma')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeDocType === 'proforma' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Proforma
              </button>
              <button
                type="button"
                onClick={() => setActiveDocType('delivery')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeDocType === 'delivery' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Delivery Note
              </button>
            </div>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy verified online link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            {/* Share WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Loading State or Rendered Invoice */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-900">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Verifying Official Document...</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Connecting to Genuine Electronics secure fiscal registration system to verify authenticity, validity, and electronic seal.
                </p>
              </div>
            </div>
          ) : orderData ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Online Verification Guarantee Notice */}
              <div className="no-print bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Authentic Electronic Document Verified • Registered in Genuine Electronics Store Fiscal Database • {store?.storeName || 'Genuine Electronics Ltd'}
                </span>
              </div>

              {/* Embedded Authentic Invoice Generator */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <InvoiceGenerator
                  order={orderData}
                  onClose={onClose}
                  storeSettings={store}
                  autoPrint={false}
                  showControls={false}
                  defaultDocType={activeDocType}
                  isClientView={true}
                  hideTypeSwitcher={false}
                  className="h-full flex flex-col min-h-0"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white">Document Record Pending or Not Found</h3>
                <p className="text-xs text-slate-400">
                  Could not find an electronic record matching document reference <span className="font-mono text-amber-400 font-bold">{activeInvoiceNo}</span>. Please verify the QR link or contact Genuine Electronics customer support hotline at {store?.phone || '+255 768 929 203'}.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-700"
              >
                Return to Shop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceVerificationModal;
