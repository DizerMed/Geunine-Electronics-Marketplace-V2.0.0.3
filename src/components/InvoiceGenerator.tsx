import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Order, formatTZS, formatToGMT3, BRAND_LOGO_URL, StoreSettings } from '../types';
import {
  Printer, Download, X, CheckCircle2, ShieldCheck, Smartphone,
  Building2, QrCode, Share2, FileText, CreditCard,
  Check, Copy, Percent, Stamp, Truck, AlertCircle, Calendar, Image as ImageIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { groupCartItemsByTaxStatus } from '../utils/taxUtils';
import { buildInvoiceVerificationUrl } from '../services/receiptQrService';
import { customAlert } from '../utils/dialog';

export interface InvoiceGeneratorProps {
  order: Order;
  onClose?: () => void;
  storeSettings?: StoreSettings;
  autoPrint?: boolean;
  showControls?: boolean;
  className?: string;
  defaultIncludeVat?: boolean;
  defaultDocType?: 'tax' | 'proforma' | 'delivery';
  isClientView?: boolean;
  hideTypeSwitcher?: boolean;
  onUpdateOrder?: (order: Order) => void;
}

interface IndexedOrderItem {
  item: any;
  originalIndex: number;
}

interface InvoicePagePlan {
  pageNumber: number;
  isFirstPage: boolean;
  items: IndexedOrderItem[];
  includeLoan: boolean;
  includeTotals: boolean;
  includePaymentOrSig: boolean;
  includeFooterSeal: boolean;
}

// Canonical A4 sheet dimensions at 96 DPI (210mm x 297mm)
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_PAD_TOP = 28;
const PAGE_PAD_BOTTOM = 24;
const PAGE_PAD_X = 32;
const PAGE_FOOTER_RESERVE = 36;
const SECTION_GAP_PX = 12;
const TABLE_CHROME_PX = 6;
// Leaves a small safety cushion so content never overflows an A4 page during print/PDF rendering
const USABLE_PAGE_BODY_HEIGHT = A4_HEIGHT_PX - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - PAGE_FOOTER_RESERVE - 14;

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  order,
  onClose,
  storeSettings,
  autoPrint = false,
  showControls = true,
  className = '',
  defaultIncludeVat,
  defaultDocType = (order.paymentStatus === 'Paid' || order.status === 'Completed' ? 'tax' : 'proforma'),
  isClientView = false,
  hideTypeSwitcher = false,
  onUpdateOrder,
}) => {
  const initialDocType = isClientView
    ? (order.paymentStatus === 'Paid' || order.status === 'Completed' ? (defaultDocType || 'tax') : 'proforma')
    : defaultDocType;
  const [docType, setDocType] = useState<'tax' | 'proforma' | 'delivery'>(initialDocType);

  useEffect(() => {
    if (isClientView) {
      setDocType(order.paymentStatus === 'Paid' || order.status === 'Completed' ? (defaultDocType || 'tax') : 'proforma');
    } else if (defaultDocType) {
      setDocType(defaultDocType);
    }
  }, [defaultDocType, isClientView, order.paymentStatus, order.status]);

  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [showShareFormatModal, setShowShareFormatModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const measureRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [pagePlans, setPagePlans] = useState<InvoicePagePlan[]>(() => [
    {
      pageNumber: 1,
      isFirstPage: true,
      items: (order.items || []).map((item, idx) => ({ item, originalIndex: idx })),
      includeLoan: docType !== 'delivery' && Boolean(order.isLoan),
      includeTotals: true,
      includePaymentOrSig: true,
      includeFooterSeal: true,
    },
  ]);

  // Document Issue Date & Quotation Expiry Date Editor State
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    if (order.createdAt) {
      try {
        const d = new Date(order.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      } catch {}
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [invoiceValidUntil, setInvoiceValidUntil] = useState<string>(() => {
    if ((order as any).validUntil) return (order as any).validUntil;
    if ((order as any).quotationExpiryDate) return (order as any).quotationExpiryDate;
    if ((order as any).dueDate) return (order as any).dueDate;
    if ((order as any).loanDueDate) return (order as any).loanDueDate;
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const [isEditingDate, setIsEditingDate] = useState(false);

  const handleDateChange = (newDateStr: string) => {
    setInvoiceDate(newDateStr);
    if (onUpdateOrder) {
      try {
        const updatedIso = new Date(newDateStr).toISOString();
        onUpdateOrder({
          ...order,
          createdAt: updatedIso,
          validUntil: invoiceValidUntil,
        } as any);
      } catch {}
    }
  };

  const handleValidUntilChange = (newValidUntil: string) => {
    setInvoiceValidUntil(newValidUntil);
    if (onUpdateOrder) {
      try {
        onUpdateOrder({
          ...order,
          validUntil: newValidUntil,
        } as any);
      } catch {}
    }
  };

  const initialVatChecked = (() => {
    if (defaultIncludeVat !== undefined) return defaultIncludeVat;
    if (order.items && order.items.length > 0) {
      const allItemsExempt = order.items.every(item => item.product?.isVatInclusive === false);
      if (allItemsExempt) return false;
    }
    if (order.includeVat !== undefined) {
      if (order.includeVat === false) return false;
      if (order.vatPercentage !== undefined && Number(order.vatPercentage) === 0) return false;
      if (order.tax !== undefined && Number(order.tax) === 0) return false;
      return true;
    }
    if (order.vatPercentage !== undefined && Number(order.vatPercentage) === 0) return false;
    if (order.tax !== undefined && Number(order.tax) === 0) return false;
    if (storeSettings?.vatPercentage !== undefined && Number(storeSettings.vatPercentage) === 0) return false;
    if (order.items && order.items.length > 0) {
      const hasExplicitVatInfo = order.items.some(item => item.product?.isVatInclusive !== undefined);
      if (hasExplicitVatInfo) {
        return order.items.some(item => item.product?.isVatInclusive !== false);
      }
    }
    return true;
  })();

  const [includeVat, setIncludeVat] = useState<boolean>(initialVatChecked);

  const shareDropdownActionRef = useRef<HTMLDivElement>(null);
  const shareDropdownBodyRef = useRef<HTMLDivElement>(null);

  // Close share dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideAction = shareDropdownActionRef.current && shareDropdownActionRef.current.contains(target);
      const insideBody = shareDropdownBodyRef.current && shareDropdownBodyRef.current.contains(target);
      if (!insideAction && !insideBody) {
        setShowShareFormatModal(false);
      }
    };
    if (showShareFormatModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareFormatModal]);

  // Body class isolation sync for direct printing
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('ge-printing-invoice');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('ge-printing-invoice');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('ge-printing-invoice');
    };
  }, []);

  const handlePrint = useCallback(() => {
    document.body.classList.add('ge-printing-invoice');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('ge-printing-invoice');
    }, 1500);
  }, []);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, handlePrint]);

  // Responsive preview scaling so 794px A4 sheets fit cleanly inside narrow mobile viewports
  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;

    const updateScale = () => {
      const available = Math.max(240, el.clientWidth - 24);
      const nextScale = available >= A4_WIDTH_PX ? 1 : Math.max(0.32, available / A4_WIDTH_PX);
      setPreviewScale(nextScale);
    };

    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateScale);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Pricing & Tax Calculations based on VAT Check status and item-level product details
  const defaultStoreVatPct = Math.min(100, Math.max(0, Number(storeSettings?.vatPercentage ?? 18)));
  const baseOrderVatPct = (order.vatPercentage !== undefined && order.vatPercentage > 0)
    ? order.vatPercentage
    : defaultStoreVatPct;

  const activeVatPercentage = includeVat ? baseOrderVatPct : 0;
  const discountAmount = order.discount ?? 0;

  const orderExtraCosts = (order.extraCosts && Array.isArray(order.extraCosts) && order.extraCosts.length > 0)
    ? order.extraCosts
    : [];

  const taxAnalysis = groupCartItemsByTaxStatus(order.items || [], {
    vatPercentage: activeVatPercentage,
    includeVat,
    discount: discountAmount,
    extraCosts: orderExtraCosts,
  });

  const calculatedTax = taxAnalysis.taxAmount;
  const calculatedSubtotal = taxAnalysis.netSubtotal;

  const extraCostsTotal = orderExtraCosts.length > 0
    ? taxAnalysis.extraCostsTotal
    : (order.totalAmount && order.totalAmount > taxAnalysis.totalBeforeExtra
        ? (order.totalAmount - taxAnalysis.totalBeforeExtra)
        : 0);

  const grandTotal = taxAnalysis.totalBeforeExtra + extraCostsTotal;

  const cleanOrderNo = (order.id || 'ORDER').replace('#', '');
  const currentDocRef = docType === 'delivery'
    ? `DN-${cleanOrderNo}`
    : docType === 'proforma'
    ? `PRO-${cleanOrderNo}`
    : `INV-${cleanOrderNo}`;
  const invoiceNo = currentDocRef;
  const orderItems = useMemo(() => order.items || [], [order.items]);
  const totalUnits = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const orderDate = (() => {
    if (!invoiceDate) {
      return order.createdAt ? formatToGMT3(order.createdAt) : new Date().toLocaleDateString('en-GB');
    }
    try {
      const parts = invoiceDate.split('-');
      if (parts.length === 3) {
        const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
        return dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return formatToGMT3(invoiceDate);
    } catch {
      return order.createdAt ? formatToGMT3(order.createdAt) : new Date().toLocaleDateString('en-GB');
    }
  })();

  const quotationValidUntil = (() => {
    if (!invoiceValidUntil) return '';
    try {
      const parts = invoiceValidUntil.split('-');
      if (parts.length === 3) {
        const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
        return dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return invoiceValidUntil;
    } catch {
      return invoiceValidUntil;
    }
  })();

  const defaultPaymentMethods = [
    { id: '1', type: 'Bank Transfer' as const, provider: 'CRDB Bank Tanzania PLC', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Transfer directly to CRDB account. Quote invoice number as reference.', isActive: true },
    { id: '2', type: 'Mobile Money' as const, provider: 'M-Pesa / Mixx By Yas / Airtel Money', accountName: 'Genuine Electronics Ltd', accountNumber: '0768 929 203', instructions: 'Pay via Till/Lipa Namba 0768 929 203.', isActive: true },
    { id: '3', type: 'Orbi Pay' as const, provider: 'Orbi Pay Wallet', accountName: 'Genuine Electronics Ltd', accountNumber: 'ORBI-9901', instructions: 'Pay via Orbi Pay barcode/wallet tag.', isActive: true }
  ];

  const availableMethods = (storeSettings?.paymentMethods && storeSettings.paymentMethods.length > 0)
    ? storeSettings.paymentMethods
    : defaultPaymentMethods;

  const selectedMethod = availableMethods.find((m) => {
    const pMethod = (order.paymentMethod || '').toLowerCase();
    const mType = (m.type || '').toLowerCase();
    const mProvider = (m.provider || '').toLowerCase();
    const mId = (m.id || '').toLowerCase();
    return (
      mId === pMethod ||
      mType === pMethod ||
      mProvider.includes(pMethod) ||
      pMethod.includes(mType) ||
      pMethod.includes(mProvider)
    );
  });

  // Safe item field accessors supporting both populated product objects & relational item rows
  const getItemName = (item: any) => item?.product?.name || item?.name || 'Product Item';
  const getItemSku = (item: any, idx: number) => item?.product?.sku || item?.sku || `SKU-${idx + 1}`;
  const getItemBrand = (item: any) => item?.product?.brand || item?.brand || '';
  const getItemCategory = (item: any) => item?.product?.category || item?.category || 'Electronics';

  // Exact DOM-measured A4 pagination planner (zero cut product rows across Print, PDF, and Image)
  const computePagination = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;

    const getHeight = (selector: string): number => {
      const el = root.querySelector(selector) as HTMLElement | null;
      return el ? Math.ceil(el.getBoundingClientRect().height) : 0;
    };

    const headerP1H = getHeight('[data-measure="header-p1"]');
    const headerContH = getHeight('[data-measure="header-cont"]');
    const theadH = getHeight('[data-measure="thead"]');
    const loanH = docType !== 'delivery' && order.isLoan ? getHeight('[data-measure="loan"]') : 0;
    const totalsH = getHeight('[data-measure="totals"]');
    const paymentOrSigH = getHeight('[data-measure="payment-or-sig"]');
    const footerSealH = getHeight('[data-measure="footer-seal"]');

    const rowHeights = orderItems.map((_, idx) => getHeight(`[data-measure-row="${idx}"]`));

    const usable = USABLE_PAGE_BODY_HEIGHT;
    const plans: InvoicePagePlan[] = [];

    let pageNum = 1;
    let isFirst = true;
    let used = headerP1H;
    let currentItems: IndexedOrderItem[] = [];

    const flushPage = (extras?: Partial<InvoicePagePlan>) => {
      plans.push({
        pageNumber: pageNum,
        isFirstPage: isFirst,
        items: currentItems,
        includeLoan: false,
        includeTotals: false,
        includePaymentOrSig: false,
        includeFooterSeal: false,
        ...extras,
      });
      pageNum += 1;
      isFirst = false;
      currentItems = [];
      used = headerContH;
    };

    // 1. Pack product rows across pages without ever splitting a <tr>
    for (let i = 0; i < orderItems.length; i += 1) {
      const rowH = Math.max(24, rowHeights[i] || 36);
      const needed = currentItems.length === 0
        ? SECTION_GAP_PX + theadH + TABLE_CHROME_PX + rowH
        : rowH;

      if (used + needed <= usable) {
        currentItems.push({ item: orderItems[i], originalIndex: i });
        used += needed;
      } else {
        // Start a new page only if current page already has content (or is Page 1 with large header)
        if (currentItems.length > 0 || isFirst) {
          flushPage();
        }
        const freshNeeded = SECTION_GAP_PX + theadH + TABLE_CHROME_PX + rowH;
        currentItems.push({ item: orderItems[i], originalIndex: i });
        used += freshNeeded;
      }
    }

    // 2. Pack summary / loan / payment / signature / official seal blocks cleanly at the end
    let currentLoan = false;
    let currentTotals = false;
    let currentPaymentOrSig = false;
    let currentFooterSeal = false;

    const flushWithTrailing = () => {
      plans.push({
        pageNumber: pageNum,
        isFirstPage: isFirst,
        items: currentItems,
        includeLoan: currentLoan,
        includeTotals: currentTotals,
        includePaymentOrSig: currentPaymentOrSig,
        includeFooterSeal: currentFooterSeal,
      });
      pageNum += 1;
      isFirst = false;
      currentItems = [];
      currentLoan = false;
      currentTotals = false;
      currentPaymentOrSig = false;
      currentFooterSeal = false;
      used = headerContH;
    };

    if (loanH > 0) {
      if (used + SECTION_GAP_PX + loanH > usable) {
        flushWithTrailing();
      }
      currentLoan = true;
      used += SECTION_GAP_PX + loanH;
    }

    if (totalsH > 0) {
      if (used + SECTION_GAP_PX + totalsH > usable) {
        flushWithTrailing();
      }
      currentTotals = true;
      used += SECTION_GAP_PX + totalsH;
    }

    // Keep Payment/Signatures + QR/Official Seal together whenever they fit together on a fresh page
    if (paymentOrSigH > 0 && footerSealH > 0) {
      const combinedNeeded = SECTION_GAP_PX + paymentOrSigH + SECTION_GAP_PX + footerSealH;
      if (used + combinedNeeded <= usable) {
        currentPaymentOrSig = true;
        currentFooterSeal = true;
        used += combinedNeeded;
      } else {
        // Check if moving both together onto a fresh page fits cleanly
        if (headerContH + combinedNeeded <= usable) {
          flushWithTrailing();
          currentPaymentOrSig = true;
          currentFooterSeal = true;
          used += combinedNeeded;
        } else {
          if (used + SECTION_GAP_PX + paymentOrSigH > usable) {
            flushWithTrailing();
          }
          currentPaymentOrSig = true;
          used += SECTION_GAP_PX + paymentOrSigH;

          if (used + SECTION_GAP_PX + footerSealH > usable) {
            flushWithTrailing();
          }
          currentFooterSeal = true;
          used += SECTION_GAP_PX + footerSealH;
        }
      }
    } else {
      if (paymentOrSigH > 0) {
        if (used + SECTION_GAP_PX + paymentOrSigH > usable) {
          flushWithTrailing();
        }
        currentPaymentOrSig = true;
        used += SECTION_GAP_PX + paymentOrSigH;
      }
      if (footerSealH > 0) {
        if (used + SECTION_GAP_PX + footerSealH > usable) {
          flushWithTrailing();
        }
        currentFooterSeal = true;
        used += SECTION_GAP_PX + footerSealH;
      }
    }

    // Push final page
    plans.push({
      pageNumber: pageNum,
      isFirstPage: isFirst,
      items: currentItems,
      includeLoan: currentLoan,
      includeTotals: currentTotals,
      includePaymentOrSig: currentPaymentOrSig,
      includeFooterSeal: currentFooterSeal,
    });

    setPagePlans((prev) => {
      if (
        prev.length === plans.length &&
        prev.every((p, idx) => {
          const n = plans[idx];
          return (
            p.pageNumber === n.pageNumber &&
            p.isFirstPage === n.isFirstPage &&
            p.items.length === n.items.length &&
            p.items.every((it, ii) => it.originalIndex === n.items[ii]?.originalIndex) &&
            p.includeLoan === n.includeLoan &&
            p.includeTotals === n.includeTotals &&
            p.includePaymentOrSig === n.includePaymentOrSig &&
            p.includeFooterSeal === n.includeFooterSeal
          );
        })
      ) {
        return prev;
      }
      return plans;
    });
  }, [docType, order.isLoan, orderItems]);

  useLayoutEffect(() => {
    computePagination();
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) {
          computePagination();
        }
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [
    computePagination,
    order,
    docType,
    includeVat,
    showStamp,
    invoiceDate,
    invoiceValidUntil,
    selectedMethod?.id,
    activeVatPercentage,
  ]);

  /**
   * Helper to verify if a captured canvas is entirely blank (monochrome/transparent)
   */
  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return true;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return true;
      const sampleW = Math.min(canvas.width, 120);
      const sampleH = Math.min(canvas.height, 120);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const d = imgData.data;
      const r0 = d[0], g0 = d[1], b0 = d[2], a0 = d[3];
      for (let i = 4; i < d.length; i += 4) {
        if (
          Math.abs(d[i] - r0) > 8 ||
          Math.abs(d[i + 1] - g0) > 8 ||
          Math.abs(d[i + 2] - b0) > 8 ||
          Math.abs(d[i + 3] - a0) > 8
        ) {
          return false;
        }
      }
      if (canvas.height > 200) {
        const midY = Math.floor(canvas.height / 2);
        const midData = ctx.getImageData(0, midY, sampleW, Math.min(canvas.height - midY, 120)).data;
        for (let i = 0; i < midData.length; i += 4) {
          if (midData[i] < 180 && midData[i + 1] < 180 && midData[i + 2] < 180 && midData[i + 3] > 60) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Captures a single canonical A4 page element (794px x 1123px) via an unscaled offscreen clone
   * with all loaded <img> tags inlined as data URLs so exports are identical on mobile & desktop.
   */
  const captureSingleA4PageCanvas = async (pageElement: HTMLElement): Promise<HTMLCanvasElement> => {
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {}

    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '-14000px';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.height = `${A4_HEIGHT_PX}px`;
    container.style.backgroundColor = '#ffffff';
    container.style.visibility = 'visible';
    container.style.overflow = 'hidden';
    container.style.zIndex = '-1';

    const clone = pageElement.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_WIDTH_PX}px`;
    clone.style.minWidth = `${A4_WIDTH_PX}px`;
    clone.style.maxWidth = `${A4_WIDTH_PX}px`;
    clone.style.height = `${A4_HEIGHT_PX}px`;
    clone.style.minHeight = `${A4_HEIGHT_PX}px`;
    clone.style.maxHeight = `${A4_HEIGHT_PX}px`;
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.padding = `${PAGE_PAD_TOP}px ${PAGE_PAD_X}px ${PAGE_PAD_BOTTOM}px ${PAGE_PAD_X}px`;
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';
    clone.style.border = 'none';
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'flex';
    clone.style.flexDirection = 'column';
    clone.style.boxSizing = 'border-box';

    // Inline already-loaded images to avoid cross-origin failures during SVG/canvas serialization
    const origImages = pageElement.querySelectorAll('img');
    const cloneImages = clone.querySelectorAll('img');
    origImages.forEach((origImg, idx) => {
      const cloneImg = cloneImages[idx];
      if (cloneImg && origImg.complete && origImg.naturalWidth > 0) {
        try {
          const imgCanvas = document.createElement('canvas');
          imgCanvas.width = origImg.naturalWidth;
          imgCanvas.height = origImg.naturalHeight;
          const ctx = imgCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(origImg, 0, 0);
            cloneImg.src = imgCanvas.toDataURL('image/png');
          }
        } catch {
          cloneImg.src = origImg.src;
        }
      }
    });

    const noPrintElements = clone.querySelectorAll('.no-print');
    noPrintElements.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      const canvas = await toCanvas(clone, {
        pixelRatio: 2,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) return false;
          return true;
        },
      });

      if (canvas && !isCanvasBlank(canvas)) {
        return canvas;
      }

      // Fallback capture if first attempt returned blank
      return await toCanvas(clone, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipFonts: true,
      });
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };

  /**
   * Generates high-resolution canonical A4 canvases for EVERY paginated page.
   */
  const generateAllPageCanvases = async (): Promise<HTMLCanvasElement[]> => {
    const activeElements = pagePlans
      .map((_, idx) => pageRefs.current[idx])
      .filter((el): el is HTMLDivElement => Boolean(el));

    const canvases: HTMLCanvasElement[] = [];
    for (const el of activeElements) {
      const c = await captureSingleA4PageCanvas(el);
      canvases.push(c);
    }
    return canvases;
  };

  /**
   * Combines multi-page A4 canvases into one cleanly framed stacked vertical PNG
   * with page gaps and Page X of Y footers preserved intact (clamped within browser max canvas limits).
   */
  const composeMultiPageImageCanvas = (canvases: HTMLCanvasElement[]): HTMLCanvasElement => {
    if (canvases.length === 1) return canvases[0];

    const pageW = canvases[0].width;
    const pageH = canvases[0].height;
    const outerPad = 36;
    const pageGap = 36;

    const rawTotalW = pageW + outerPad * 2;
    const rawTotalH = outerPad * 2 + canvases.length * pageH + (canvases.length - 1) * pageGap;

    const MAX_CANVAS_HEIGHT = 14000;
    const scaleDown = rawTotalH > MAX_CANVAS_HEIGHT ? MAX_CANVAS_HEIGHT / rawTotalH : 1;

    const finalW = Math.round(rawTotalW * scaleDown);
    const finalH = Math.round(rawTotalH * scaleDown);

    const composite = document.createElement('canvas');
    composite.width = finalW;
    composite.height = finalH;

    const ctx = composite.getContext('2d');
    if (!ctx) return canvases[0];

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, finalW, finalH);

    const drawPad = outerPad * scaleDown;
    const drawGap = pageGap * scaleDown;
    const drawW = pageW * scaleDown;
    const drawH = pageH * scaleDown;

    canvases.forEach((pageCanvas, idx) => {
      const y = drawPad + idx * (drawH + drawGap);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(drawPad - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(pageCanvas, drawPad, y, drawW, drawH);
    });

    return composite;
  };

  /**
   * Multi-page A4 PDF builder: 1 exact pre-paginated canvas per PDF page (zero row slicing).
   */
  const buildInvoicePDFDocFromCanvases = (canvases: HTMLCanvasElement[]): jsPDF => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    canvases.forEach((canvas, idx) => {
      if (idx > 0) {
        pdf.addPage();
      }
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    });

    return pdf;
  };

  const getCleanInvoiceFilename = (extension: 'pdf' | 'png', pageSuffix?: string) => {
    const cleanNo = (order.id || 'ORDER').replace('#', '');
    const docPrefix = docType === 'delivery' ? 'DeliveryNote' : docType === 'proforma' ? 'Proforma' : 'TaxInvoice';
    return `${docPrefix}_${invoiceNo}_${cleanNo}${pageSuffix ? `_${pageSuffix}` : ''}.${extension}`;
  };

  const triggerBlobDownload = (blobOrUrl: Blob | string, filename: string) => {
    const isString = typeof blobOrUrl === 'string';
    const url = isString ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!isString) {
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const handleDownloadPDF = async () => {
    if (pagePlans.length === 0) return;
    setIsGeneratingPDF(true);

    try {
      const canvases = await generateAllPageCanvases();
      if (canvases.length === 0) throw new Error('No rendered pages available');
      const pdf = buildInvoicePDFDocFromCanvases(canvases);
      const filename = getCleanInvoiceFilename('pdf');

      try {
        pdf.save(filename);
      } catch {
        const blob = pdf.output('blob');
        triggerBlobDownload(blob, filename);
      }
    } catch (err) {
      console.error('Failed to generate PDF invoice:', err);
      customAlert('Could not generate PDF file directly. Opening system print window instead.');
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadImage = async () => {
    if (pagePlans.length === 0) return;
    setIsGeneratingImage(true);

    try {
      const canvases = await generateAllPageCanvases();
      if (canvases.length === 0) throw new Error('No rendered pages available');
      const composite = composeMultiPageImageCanvas(canvases);
      const dataUrl = composite.toDataURL('image/png', 1.0);
      const filename = getCleanInvoiceFilename('png', canvases.length > 1 ? `${canvases.length}Pages` : undefined);
      triggerBlobDownload(dataUrl, filename);
    } catch (err) {
      console.error('Failed to generate PNG invoice:', err);
      customAlert('Could not generate image file. Please try PDF export or Print.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const getInvoiceText = () => {
    if (docType === 'delivery') {
      let msg = `📦 *OFFICIAL DELIVERY NOTE & PACKING SLIP*\n`;
      msg += `*${storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'}*\n`;
      msg += `📍 ${storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}\n`;
      msg += `📞 Hotline: ${storeSettings?.phone || '+255 768 929 203'} | Dispatch & Logistics Dept.\n`;
      msg += `----------------------------------------\n`;
      msg += `📄 *Consignment Ref:* ${currentDocRef}\n`;
      msg += `📅 *Date:* ${orderDate}\n`;
      if (order.customerName) msg += `👤 *Consignee / Recipient:* ${order.customerName}\n`;
      if (order.customerPhone) msg += `📞 *Phone:* ${order.customerPhone}\n`;
      if (order.shippingAddress) msg += `📍 *Delivery Address:* ${order.shippingAddress}${order.city ? `, ${order.city}` : ''}\n`;
      if (order.courierName) msg += `🚚 *Carrier / Courier:* ${order.courierName}\n`;
      if (order.trackingNumber) msg += `🔖 *Waybill / Tracking:* ${order.trackingNumber}\n`;
      if (order.deliveryNotes) msg += `📝 *Delivery Notes:* ${order.deliveryNotes}\n`;
      msg += `----------------------------------------\n*DISPATCHED ITEMS (PACKING LIST):*\n`;

      orderItems.forEach((item, idx) => {
        const qty = item.quantity || 1;
        msg += `${idx + 1}. ${getItemName(item)} (Qty: ${qty} Unit${qty > 1 ? 's' : ''}) [SKU: ${getItemSku(item, idx)}]\n`;
      });

      msg += `----------------------------------------\n`;
      msg += `📦 *Total Packages Dispatched:* ${totalUnits} Units (${orderItems.length} Line Items)\n`;
      msg += `📋 *Inspection Status:* Verified & intact prior to dispatch.\n`;
      msg += `✍️ *Notice:* Consignee must inspect all packages and sign physical delivery note upon receipt.\n`;
      if (showStamp) {
        msg += `★ OFFICIALLY DISPATCHED & VERIFIED - Genuine Electronics Tanzania Ltd ★\n`;
      }
      msg += `\nVerify Consignment Authenticity Online: ${buildInvoiceVerificationUrl({ orderNo: cleanOrderNo, invoiceNo: currentDocRef, docType: 'delivery' })}\n`;
      return msg;
    }

    const docTitle = docType === 'proforma'
      ? 'PROFORMA INVOICE / PRICE QUOTATION'
      : (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'COMMERCIAL TAX INVOICE' : 'COMMERCIAL SALES INVOICE');

    let msg = `🧾 *${docTitle}*\n`;
    msg += `*${storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'}*\n`;
    msg += `📍 ${storeSettings?.address || 'Kariakoo, Dar es Salaam Tanzania'}\n`;
    const contactParts = [
      `Hotline: ${storeSettings?.phone || '+255 768 929 203'}`,
      ...(storeSettings?.tin ? [`TIN: ${storeSettings.tin}`] : []),
      ...(storeSettings?.vrn ? [`VRN: ${storeSettings.vrn}`] : [])
    ];
    msg += `📞 ${contactParts.join(' | ')}\n`;
    msg += `----------------------------------------\n`;
    msg += `📄 *Doc Reference:* ${currentDocRef}\n`;
    msg += `📅 *Date & Time:* ${orderDate}\n`;
    if (order.customerName) msg += `👤 *Customer / Buyer:* ${order.customerName}\n`;
    if (order.customerPhone) msg += `📞 *Phone:* ${order.customerPhone}\n`;
    if (order.customerTin) msg += `🏢 *Buyer TIN:* ${order.customerTin}\n`;
    if (order.shippingAddress) msg += `📍 *Delivery Address:* ${order.shippingAddress}${order.city ? `, ${order.city}` : ''}\n`;
    msg += `----------------------------------------\n*ORDER ITEMS:*\n`;

    orderItems.forEach((item, idx) => {
      const price = item.price || item.product?.price || 0;
      const total = price * item.quantity;
      const vatTag = includeVat && item.product?.isVatInclusive !== false ? ' [VAT]' : '';
      msg += `${idx + 1}. ${getItemName(item)}${vatTag}\n   Qty: ${item.quantity} x ${formatTZS(price)} = ${formatTZS(total)}\n`;
    });

    if (orderExtraCosts.length > 0) {
      msg += `----------------------------------------\n*EXTRA SERVICES & DELIVERY:*\n`;
      orderExtraCosts.forEach(c => {
        msg += `• ${c.name}: +${formatTZS(c.amount)}\n`;
      });
    }

    msg += `----------------------------------------\n`;
    if (includeVat && activeVatPercentage > 0 && calculatedTax > 0) {
      msg += `Net Subtotal: ${formatTZS(calculatedSubtotal)}\n`;
      msg += `VAT (${activeVatPercentage}%): ${formatTZS(calculatedTax)}\n`;
    } else {
      msg += `Subtotal: ${formatTZS(calculatedSubtotal)}\n`;
    }
    if (discountAmount > 0) {
      msg += `Discount Applied: -${formatTZS(discountAmount)}\n`;
    }
    msg += `💰 *${docType === 'proforma' ? 'QUOTED TOTAL' : 'GRAND TOTAL'}:* ${formatTZS(grandTotal)}\n`;

    if (order.isLoan) {
      const total = Number(order.totalAmount ?? grandTotal);
      const repayments = order.loanRepayments || [];
      const repaymentsSum = repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const initialDeposit = Number(order.downPayment ?? 0);
      const totalPaid = Math.min(total, initialDeposit + repaymentsSum);
      const remainingBalance = Math.max(0, total - totalPaid);

      msg += `----------------------------------------\n`;
      msg += `📋 *CREDIT / INSTALLMENT STATUS:*\n`;
      msg += `Down Payment: ${formatTZS(initialDeposit)}\n`;
      msg += `Total Paid: ${formatTZS(totalPaid)}\n`;
      msg += `Remaining Loan Balance: ${formatTZS(remainingBalance)}\n`;
      if (order.loanDueDate) msg += `Repayment Due: ${order.loanDueDate}\n`;
    }

    if (selectedMethod) {
      msg += `----------------------------------------\n*${docType === 'proforma' ? 'QUOTATION REMITTANCE CHANNEL' : 'OFFICIAL SETTLEMENT ACCOUNT'}:*\n`;
      msg += `Payment Type: ${selectedMethod.provider} (${selectedMethod.type})\n`;
      msg += `Account / Till: ${selectedMethod.accountNumber}\n`;
      msg += `Account Name: ${selectedMethod.accountName}\n`;
      if (selectedMethod.instructions) msg += `Instructions: ${selectedMethod.instructions}\n`;
    }

    if (docType === 'proforma') {
      msg += `\n*Notice:* This Proforma Quotation is valid for 14 calendar days from the date of issue.\n`;
    }

    if (showStamp) {
      msg += `\n★ OFFICIALLY STAMPED & AUTHORIZED - Genuine Electronics Tanzania Ltd ★\n`;
    }

    msg += `\nVerify Authenticity Online: ${buildInvoiceVerificationUrl({
      orderNo: cleanOrderNo,
      invoiceNo: currentDocRef,
      docType,
      totalAmount: grandTotal,
      customerName: order.customerName,
      paymentStatus: order.paymentStatus
    })}\n`;
    msg += `Thank you for choosing Genuine Electronics!`;

    return msg;
  };

  const handleShareMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareFormatModal(!showShareFormatModal);
  };

  const shareNative = async (format: 'text' | 'image' | 'pdf') => {
    setIsSharing(true);
    setShowShareFormatModal(false);
    try {
      if (format === 'text') {
        const text = getInvoiceText();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
              text,
            });
          } catch (shareErr: any) {
            if (shareErr?.name !== 'AbortError') {
              await navigator.clipboard.writeText(text);
              customAlert('Invoice summary copied to clipboard!');
            }
          }
        } else {
          await navigator.clipboard.writeText(text);
          customAlert('Invoice summary copied to clipboard!');
        }
      } else if (format === 'image') {
        const canvases = await generateAllPageCanvases();
        if (canvases.length === 0) return;

        // Try sharing individual Page X of Y files on supported devices
        const pageFiles: File[] = [];
        for (let i = 0; i < canvases.length; i += 1) {
          const dataUrl = canvases[i].toDataURL('image/png', 1.0);
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const suffix = canvases.length > 1 ? `Page_${i + 1}_of_${canvases.length}` : undefined;
          pageFiles.push(new File([blob], getCleanInvoiceFilename('png', suffix), { type: 'image/png' }));
        }

        let shared = false;
        if (navigator.canShare && navigator.canShare({ files: pageFiles })) {
          try {
            await navigator.share({
              title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
              files: pageFiles,
            });
            shared = true;
          } catch (err: any) {
            if (err?.name === 'AbortError') {
              shared = true;
            } else {
              console.warn('Multi-page image share fallback:', err?.message || err);
            }
          }
        }

        if (!shared) {
          const composite = composeMultiPageImageCanvas(canvases);
          const dataUrl = composite.toDataURL('image/png', 1.0);
          const singleName = getCleanInvoiceFilename('png', canvases.length > 1 ? `${canvases.length}Pages` : undefined);

          if (canvases.length > 1 && navigator.canShare) {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const singleFile = new File([blob], singleName, { type: 'image/png' });
            if (navigator.canShare({ files: [singleFile] })) {
              try {
                await navigator.share({
                  title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
                  files: [singleFile],
                });
                shared = true;
              } catch (err: any) {
                if (err?.name === 'AbortError') shared = true;
              }
            }
          }

          if (!shared) {
            triggerBlobDownload(dataUrl, singleName);
          }
        }
      } else if (format === 'pdf') {
        const canvases = await generateAllPageCanvases();
        if (canvases.length === 0) return;
        const pdf = buildInvoicePDFDocFromCanvases(canvases);
        const pdfBlob = pdf.output('blob');
        const fileName = getCleanInvoiceFilename('pdf');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        let shared = false;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${docType === 'tax' ? 'Invoice' : docType === 'proforma' ? 'Proforma' : 'Delivery Note'} ${invoiceNo}`,
              files: [file],
            });
            shared = true;
          } catch (err: any) {
            if (err?.name !== 'AbortError') {
              console.warn('Share not permitted, falling back to download:', err?.message || err);
            } else {
              shared = true;
            }
          }
        }
        if (!shared) {
          try {
            pdf.save(fileName);
          } catch {
            triggerBlobDownload(pdfBlob, fileName);
          }
        }
      }
    } catch (err) {
      console.error('Error during share export:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const copyInvoiceText = () => {
    navigator.clipboard.writeText(invoiceNo);
    setCopiedInvoiceNo(true);
    setTimeout(() => setCopiedInvoiceNo(false), 2000);
  };

  // ==================== SHARED DOCUMENT BLOCK RENDERERS ====================

  const docBadgeLabel = docType === 'tax'
    ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'OFFICIAL TAX INVOICE' : 'COMMERCIAL SALES INVOICE')
    : docType === 'proforma'
    ? 'PROFORMA INVOICE / QUOTATION'
    : 'DELIVERY NOTE & PACKING SLIP';

  const docBadgeClass = docType === 'tax'
    ? (includeVat ? 'border-slate-900 bg-white text-slate-900' : 'border-slate-400 bg-slate-100 text-slate-700')
    : docType === 'proforma'
    ? 'border-blue-900 bg-blue-50 text-blue-900'
    : 'border-emerald-900 bg-emerald-50 text-emerald-900';

  const renderPage1Header = (interactive: boolean) => (
    <div className="space-y-3">
      {/* Header Section: Brand Logo, Legal Company Info & Invoice Metadata */}
      <div className="flex flex-row justify-between items-start pb-3 border-b-2 border-slate-900 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto flex items-center justify-center shrink-0">
              <img
                src={BRAND_LOGO_URL}
                alt={storeSettings?.storeName || 'Genuine Electronics'}
                className="h-12 w-auto max-w-[140px] object-contain"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              </h1>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                Authorized Consumer & Enterprise Technology Retailer
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-700 mt-2 space-y-0.5">
            <p className="font-bold text-slate-900">
              {storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'} • {storeSettings?.address || 'Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania'}
            </p>
            <p>Hotline: {storeSettings?.phone || '+255 768 929 203'} | Email: {storeSettings?.email || 'sales@genuine-electronics.com'}</p>
            {(storeSettings?.tin || storeSettings?.vrn) ? (
              <p className="font-mono text-[10px] text-slate-600">
                {storeSettings?.tin ? `TIN: ${storeSettings.tin}` : ''}
                {storeSettings?.tin && storeSettings?.vrn ? ' | ' : ''}
                {storeSettings?.vrn ? `VRN: ${storeSettings.vrn}` : ''}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative text-right bg-slate-50 p-3 rounded-xl border border-slate-300 w-auto max-w-[270px] shrink-0 space-y-1">
          <div className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${docBadgeClass}`}>
            {docBadgeLabel}
          </div>
          <p className="text-base font-black text-slate-900 font-mono tracking-tight">
            {currentDocRef}
          </p>
          <div className="text-[11px] text-slate-700 space-y-0.5">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <p><span className="font-semibold text-slate-600">Issue Date:</span> <strong className="text-slate-900">{orderDate}</strong></p>
              {interactive && !isClientView && (
                <button
                  type="button"
                  onClick={() => setIsEditingDate(prev => !prev)}
                  className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                  title="Click to edit document date"
                >
                  <Calendar className="w-3 h-3" />
                  <span>{isEditingDate ? 'Done' : 'Edit'}</span>
                </button>
              )}
            </div>
            {docType === 'proforma' && quotationValidUntil && (
              <p><span className="font-semibold text-slate-600">Valid Until:</span> <strong className="text-slate-900">{quotationValidUntil}</strong></p>
            )}
            <p><span className="font-semibold text-slate-600">Order ID:</span> <span className="font-mono font-bold text-slate-900">{order.id}</span></p>
            {docType !== 'delivery' && includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
              <p>
                <span className="font-semibold text-slate-600">VAT Status:</span>{' '}
                <strong className="text-emerald-700">
                  VAT {activeVatPercentage}% Included
                </strong>
              </p>
            )}
            {order.trackingNumber && (
              <p><span className="font-semibold text-slate-600">Tracking:</span> <span className="font-mono font-bold text-slate-900">{order.trackingNumber}</span></p>
            )}
          </div>

          {interactive && isEditingDate && !isClientView && (
            <div className="no-print absolute right-0 top-full mt-1.5 z-30 w-72 p-3 rounded-xl bg-blue-50 border border-blue-300 shadow-2xl space-y-2 text-left animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-800">
                <span className="flex items-center gap-1 text-blue-700">
                  <Calendar className="w-3.5 h-3.5" />
                  Document Date Settings
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    handleDateChange(todayStr);
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Today
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {docType === 'proforma' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Quotation Validity / Expiry
                    </label>
                    <input
                      type="date"
                      value={invoiceValidUntil}
                      onChange={(e) => handleValidUntilChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-blue-200/60">
                <span>Applies to Print, PDF & Image</span>
                <button
                  type="button"
                  onClick={() => setIsEditingDate(false)}
                  className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer & Billing Metadata Grid */}
      <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-300">
        <div>
          <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1">
            {docType === 'delivery' ? (
              <>
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                DELIVER TO / CONSIGNEE:
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                {docType === 'proforma' ? 'QUOTED TO:' : 'BILL TO / SHIP TO:'}
              </>
            )}
          </p>
          <p className="font-bold text-slate-900 text-sm">{order.customerName || (docType === 'delivery' ? 'Valued Consignee' : 'Valued Customer')}</p>
          {docType !== 'delivery' && order.customerTin && (
            <p className="text-slate-900 text-[11px] font-mono font-bold">
              <span className="text-slate-600 font-sans font-semibold">Buyer TIN:</span> {order.customerTin}
            </p>
          )}
          {order.customerEmail && <p className="text-slate-600 text-[11px]">{order.customerEmail}</p>}
          <p className="text-slate-600 text-[11px] font-medium">
            <span className="font-semibold text-slate-700">Phone:</span> {order.customerPhone || order.phone || 'N/A'}
          </p>
          <div className="text-slate-800 mt-1 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              {docType === 'delivery' ? 'Physical Consignment Destination:' : 'Physical Delivery Address:'}
            </span>
            {order.shippingAddress || 'Dar es Salaam, Tanzania'}
            {order.city ? `, ${order.city}` : ''}
          </div>
          {order.deliveryNotes && (
            <div className="text-slate-800 text-[10px] mt-1 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900 block uppercase text-[9px]">Special Handling & Dispatch Notes:</span>
              {order.deliveryNotes}
            </div>
          )}
        </div>

        {docType === 'delivery' ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              DISPATCH & CONSIGNMENT DETAILS:
            </p>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">Consignment Status:</span>
                <span className="font-black px-2 py-0.5 rounded border text-emerald-800 bg-emerald-50 border-emerald-300 text-[10px]">
                  DISPATCHED & VERIFIED
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">Carrier / Courier:</span>
                <span className="font-bold text-slate-900 text-right">
                  {order.courierName || 'Store Logistics / Express Courier'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">Waybill / Tracking No:</span>
                <span className="font-mono font-bold text-slate-900">
                  {order.trackingNumber || `WB-${cleanOrderNo}`}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">Total Packages:</span>
                <span className="font-bold text-slate-900">
                  {totalUnits} Units ({orderItems.length} Line Items)
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">Packaging Condition:</span>
                <span className="font-bold text-emerald-700">
                  Factory Sealed & Tamper-Evident
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              {docType === 'proforma' ? 'QUOTATION & TERMS DETAILS:' : 'ORDER & SETTLEMENT DETAILS:'}
            </p>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">{docType === 'proforma' ? 'Proposed Payment:' : 'Payment Method:'}</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {order.paymentMethod || 'Mobile Money'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 font-medium">{docType === 'proforma' ? 'Quotation Status:' : 'Payment Status:'}</span>
                <span className={`font-black px-2 py-0.5 rounded border text-[10px] ${
                  docType === 'proforma'
                    ? 'text-blue-800 bg-blue-50 border-blue-300'
                    : (order.paymentStatus === 'Paid' || order.status === 'Delivered')
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                    : 'text-amber-800 bg-amber-50 border-amber-300'
                }`}>
                  {docType === 'proforma' ? 'PROFORMA (PENDING REMITTANCE)' : (order.paymentStatus || order.status || 'Pending').toUpperCase()}
                </span>
              </div>
              {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-600 font-medium">Tax Status:</span>
                  <span className="font-bold text-slate-900">
                    VAT {activeVatPercentage}% Included
                  </span>
                </div>
              )}
              {docType === 'proforma' && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-600 font-medium">Quotation Validity:</span>
                  <span className="font-bold text-blue-900">14 Calendar Days</span>
                </div>
              )}
              {order.courierName && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-600 font-medium">Designated Courier:</span>
                  <span className="font-bold text-slate-900">{order.courierName}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContinuationHeader = (pageNumber: number, totalPages: number) => (
    <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-900 gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={BRAND_LOGO_URL}
          alt={storeSettings?.storeName || 'Genuine Electronics'}
          className="h-8 w-auto max-w-[90px] object-contain shrink-0"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {storeSettings?.storeName || 'GENUINE ELECTRONICS'}
            </span>
            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${docBadgeClass}`}>
              {docBadgeLabel} (CONT.)
            </span>
          </div>
          <p className="text-[10px] text-slate-600 truncate">
            Customer: <strong className="text-slate-900">{order.customerName || 'Valued Customer'}</strong> • Order ID: <span className="font-mono font-bold text-slate-800">{order.id}</span>
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-black text-slate-900 font-mono">{currentDocRef}</p>
        <p className="text-[10px] text-slate-600">
          Date: <strong className="text-slate-900">{orderDate}</strong> • <strong className="text-slate-900">Page {pageNumber} of {totalPages}</strong>
        </p>
      </div>
    </div>
  );

  const renderTableHead = (forMeasure = false) => (
    <thead data-measure={forMeasure ? 'thead' : undefined}>
      <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black">
        {docType === 'delivery' ? (
          <>
            <th className="p-2.5 w-10 text-center">#</th>
            <th className="p-2.5">Item Description & Specifications</th>
            <th className="p-2.5 text-center">Category</th>
            <th className="p-2.5 text-center">Dispatched Qty</th>
            <th className="p-2.5 text-center">Unit / Packaging</th>
            <th className="p-2.5 text-center">Inspection Status</th>
          </>
        ) : (
          <>
            <th className="p-2.5 w-9 text-center">#</th>
            <th className="p-2.5">Item Description & Specifications</th>
            <th className="p-2.5 text-center">Category</th>
            <th className="p-2.5 text-center">Qty</th>
            <th className="p-2.5 text-right">Unit Price</th>
            <th className="p-2.5 text-right">{docType === 'proforma' ? 'Quoted Total (TZS)' : 'Total (TZS)'}</th>
          </>
        )}
      </tr>
    </thead>
  );

  const renderItemRow = (item: any, idx: number, forMeasure = false) => {
    const unitPrice = item.price || item.product?.price || 0;
    const lineTotal = unitPrice * item.quantity;
    const brand = getItemBrand(item);
    return (
      <tr
        key={idx}
        data-measure-row={forMeasure ? String(idx) : undefined}
        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
      >
        {docType === 'delivery' ? (
          <>
            <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
            <td className="p-2.5">
              <div className="font-bold text-slate-900">{getItemName(item)}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                <span>SKU: {getItemSku(item, idx)}</span>
                {brand && <span>• Brand: {brand}</span>}
              </div>
            </td>
            <td className="p-2.5 text-center text-slate-700">
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-semibold">
                {getItemCategory(item)}
              </span>
            </td>
            <td className="p-2.5 text-center">
              <span className="font-black text-xs text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">
                {item.quantity} Unit{item.quantity > 1 ? 's' : ''}
              </span>
            </td>
            <td className="p-2.5 text-center text-slate-600 font-medium">
              Factory Sealed Box
            </td>
            <td className="p-2.5 text-center">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Inspected & Intact
              </span>
            </td>
          </>
        ) : (
          <>
            <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
            <td className="p-2.5">
              <div className="font-bold text-slate-900">{getItemName(item)}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                <span>SKU: {getItemSku(item, idx)}</span>
                {brand && <span>• Brand: {brand}</span>}
                {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                  item.product?.isVatInclusive !== false ? (
                    <span className="text-[8px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                      VAT Applicable
                    </span>
                  ) : (
                    <span className="text-[8px] font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded">
                      Non-VAT / Exempt
                    </span>
                  )
                )}
              </div>
            </td>
            <td className="p-2.5 text-center text-slate-700">
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-semibold">
                {getItemCategory(item)}
              </span>
            </td>
            <td className="p-2.5 text-center font-bold text-slate-900">{item.quantity}</td>
            <td className="p-2.5 text-right text-slate-800">{formatTZS(unitPrice)}</td>
            <td className="p-2.5 text-right font-black text-slate-900">{formatTZS(lineTotal)}</td>
          </>
        )}
      </tr>
    );
  };

  const renderItemsTable = (items: IndexedOrderItem[], forMeasure = false) => (
    <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
      <table className="w-full text-left border-collapse text-[11px]">
        {renderTableHead(forMeasure)}
        <tbody className="divide-y divide-slate-200">
          {items.length > 0 ? (
            items.map(({ item, originalIndex }) => renderItemRow(item, originalIndex, forMeasure))
          ) : (
            <tr>
              <td colSpan={6} className="p-4 text-center text-slate-500 font-medium">
                No line items listed on this order.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderLoanSection = () => {
    if (docType === 'delivery' || !order.isLoan) return null;

    const total = Number(order.totalAmount ?? 0);
    const repayments = order.loanRepayments || [];
    const repaymentsSum = repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const initialDeposit = Number(order.downPayment ?? 0);
    const totalPaid = Math.min(total, initialDeposit + repaymentsSum);
    const remainingBalance = Math.max(0, total - totalPaid);
    const todayStr = new Date().toISOString().split('T')[0];
    const dueDate = order.loanDueDate || '';
    const isOverdue = dueDate && dueDate < todayStr && remainingBalance > 0;

    let statusLabel = 'ACTIVE / UNPAID';
    let badgeClass = 'bg-amber-200/80 text-amber-900 border-amber-300';
    if (remainingBalance <= 0) {
      statusLabel = 'FULLY PAID & CLEARED ✅';
      badgeClass = 'bg-emerald-200/80 text-emerald-900 border-emerald-300';
    } else if (isOverdue) {
      statusLabel = 'OVERDUE ⚠️';
      badgeClass = 'bg-rose-200/80 text-rose-900 border-rose-300';
    } else if (totalPaid > 0) {
      statusLabel = 'PARTIALLY PAID ⏳';
      badgeClass = 'bg-blue-200/80 text-blue-900 border-blue-300';
    }

    return (
      <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-[11px] keep-together space-y-2.5">
        <div className="flex items-center justify-between font-extrabold text-amber-950">
          <span>{docType === 'proforma' ? 'PROPOSED CREDIT & INSTALLMENT STRUCTURE' : 'CREDIT & INSTALLMENT LOAN AGREEMENT'}</span>
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-black ${badgeClass}`}>
            {statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2.5 text-slate-800 pt-1 border-t border-amber-200/60">
          <div>
            <span className="text-slate-500 text-[10px] block font-medium">Down Payment:</span>
            <strong className="text-slate-900 font-bold">{formatTZS(initialDeposit)}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-medium">Total Paid:</span>
            <strong className="text-emerald-800 font-black">{formatTZS(totalPaid)}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-medium">Remaining Balance:</span>
            <strong className="text-rose-900 font-black">{formatTZS(remainingBalance)}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-medium">Repayment Due:</span>
            <strong className="text-slate-900 font-bold">{dueDate || 'In 30 Days'}</strong>
          </div>
        </div>

        {repayments.length > 0 && (
          <div className="pt-2 border-t border-amber-200/60 text-[10px] space-y-1">
            <span className="font-bold text-amber-950 uppercase">Installment Payments History ({repayments.length}):</span>
            <div className="space-y-0.5 pl-1">
              {repayments.map((rep, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700 font-medium">
                  <span>• {rep.date ? formatToGMT3(rep.date).split(',')[0] : 'Payment'} ({rep.paymentMethod || 'Cash'})</span>
                  <span className="font-bold text-emerald-700">+{formatTZS(rep.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTotalsSection = () => (
    docType === 'delivery' ? (
      <div className="flex flex-row justify-between items-start gap-4 keep-together">
        <div className="text-[11px] text-slate-700 flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-300 space-y-1.5">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-700" />
            Goods Acceptance & Consignment Delivery Terms
          </p>
          <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside leading-relaxed">
            <li>Goods listed in this Delivery Note have been inspected and dispatched in complete, factory-sealed condition.</li>
            <li>The consignee or carrier must verify outer package seal integrity before signing physical acceptance below.</li>
            <li>Any discrepancies, quantity shortages, or external damage must be reported to Genuine Electronics Dispatch within 24 hours.</li>
          </ul>
        </div>

        <div className="w-80 shrink-0 bg-white p-3.5 rounded-xl border-2 border-slate-900 space-y-2 text-[11px]">
          <div className="font-black text-slate-900 text-xs border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>CONSIGNMENT SUMMARY</span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">VERIFIED</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="font-medium">Total Line Items:</span>
            <span className="font-bold text-slate-900">{orderItems.length} Product Lines</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="font-medium">Total Units Dispatched:</span>
            <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {totalUnits} Units
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span className="font-medium">Carton Security:</span>
            <span className="font-bold text-emerald-700">Tamper-Evident Seals</span>
          </div>
          <div className="flex justify-between pt-2 border-t-2 border-slate-900 font-black text-xs text-slate-900 bg-slate-50 p-2 rounded">
            <span>DELIVERY STATUS:</span>
            <span className="text-emerald-800">READY / DISPATCHED</span>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-row justify-between items-start gap-4 keep-together">
        <div className="text-[11px] text-slate-700 flex-1 max-w-sm bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-1">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            {docType === 'proforma' ? 'Proforma Quotation Terms & Service Guarantee' : '1-Year Genuine Warranty & Service Guarantee'}
          </p>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            {docType === 'proforma'
              ? 'This quotation is valid for 14 calendar days from the date of issue. Prices are subject to product availability. Final fiscal tax invoice is issued upon payment confirmation.'
              : 'All Genuine Electronics products include an official 1-Year manufacturer warranty and local Dar es Salaam service support. Please retain this physical tax invoice for servicing, warranty verifications, and insurance claims.'}
          </p>
        </div>

        <div className="w-80 shrink-0 bg-white p-3.5 rounded-xl border-2 border-slate-900 space-y-2 text-[11px]">
          {taxAnalysis.isMixed && taxAnalysis.taxAmount > 0 ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span className="font-medium">1. Taxable Subtotal (Net):</span>
                <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.taxableNetSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-medium">2. Non-VAT / Exempt Subtotal:</span>
                <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.exemptSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-medium">VAT ({activeVatPercentage}% on Taxable):</span>
                <span className="font-bold text-slate-900">{formatTZS(taxAnalysis.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-800 pt-1 border-t border-dotted border-slate-300 font-bold">
                <span>Total Net Subtotal:</span>
                <span>{formatTZS(taxAnalysis.netSubtotal)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-700">
                <span className="font-medium">
                  {includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'Subtotal (Excl. Tax):' : 'Subtotal:'}
                </span>
                <span className="font-bold text-slate-900">{formatTZS(calculatedSubtotal)}</span>
              </div>

              {includeVat && activeVatPercentage > 0 && calculatedTax > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">VAT ({activeVatPercentage}% Incl.):</span>
                  <span className="font-bold text-slate-900">{formatTZS(calculatedTax)}</span>
                </div>
              )}
            </>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span className="font-medium">Discount Applied:</span>
              <span className="font-bold">-{formatTZS(discountAmount)}</span>
            </div>
          )}

          {orderExtraCosts.length > 0 ? (
            orderExtraCosts.map((cost, cIdx) => (
              <div key={cIdx} className="flex justify-between text-slate-700">
                <span className="font-medium">{cost.name || 'Additional Service'}:</span>
                <span className="font-bold text-slate-900">+{formatTZS(cost.amount)}</span>
              </div>
            ))
          ) : extraCostsTotal > 0 ? (
            <div className="flex justify-between text-slate-700">
              <span className="font-medium">Delivery & Handling:</span>
              <span className="font-bold text-slate-900">+{formatTZS(extraCostsTotal)}</span>
            </div>
          ) : null}

          <div className="flex justify-between pt-2 border-t-2 border-slate-900 font-black text-base text-slate-900 bg-slate-100 p-2 rounded">
            <span>{docType === 'proforma' ? 'QUOTED TOTAL:' : 'GRAND TOTAL:'}</span>
            <span>{formatTZS(grandTotal)}</span>
          </div>
        </div>
      </div>
    )
  );

  const renderPaymentOrSignaturesSection = (interactive: boolean) => (
    docType !== 'delivery' ? (
      <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 space-y-2 text-[11px] keep-together">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            {docType === 'proforma'
              ? 'PROFORMA PAYMENT & REMITTANCE CHANNELS'
              : 'OFFICIAL SETTLEMENT & REMITTANCE CHANNELS'}
          </span>
          <span className="text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded uppercase">
            {docType === 'proforma' ? 'Quote Reference' : 'Payment Method'}: {order.paymentMethod || 'Selected at Checkout'}
          </span>
        </div>

        {selectedMethod ? (
          <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5">
                {selectedMethod.type === 'Mobile Money' ? (
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : selectedMethod.type === 'Orbi Pay' ? (
                  <QrCode className="w-4 h-4 text-purple-600 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                )}
                <span>{selectedMethod.provider} ({selectedMethod.type})</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                Verified Merchant Account
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[9px] font-bold block uppercase">Account / Till Number:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{selectedMethod.accountNumber}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[9px] font-bold block uppercase">Account Name:</span>
                <span className="font-bold text-slate-900 text-xs">{selectedMethod.accountName}</span>
              </div>
            </div>
            {selectedMethod.instructions && (
              <div className="text-slate-600 text-[10px] pt-1 border-t border-slate-100 mt-1">
                <span className="font-bold text-slate-800">Payment Instructions:</span> {selectedMethod.instructions}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-700" />
                <span>{order.paymentMethod || 'Selected Payment Method'}</span>
              </div>
              <span className="bg-blue-50 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-200">
                Direct Payment
              </span>
            </div>
            <p className="text-slate-600 text-[10px] pt-1">
              Selected payment option: <strong className="text-slate-900">{order.paymentMethod}</strong>. Please quote reference <strong className="text-slate-900">{currentDocRef}</strong> during deposit.
            </p>
          </div>
        )}

        <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[10px]">
          <span className="text-slate-700">
            Please quote Reference <strong className="text-slate-900">{currentDocRef}</strong> as payment reference for automated reconciliation.
          </span>
          {interactive && (
            <div className="relative no-print" ref={shareDropdownBodyRef}>
              <button
                type="button"
                onClick={handleShareMenuClick}
                disabled={isSharing}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3 h-3" />
                <span>Share {docType === 'proforma' ? 'Quotation' : 'Invoice'}</span>
              </button>

              {showShareFormatModal && (
                <div className="absolute bottom-full mb-2 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-2 flex flex-col gap-1">
                    <div className="text-[10px] font-black text-slate-500 uppercase px-2 mb-1">Select Format</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('image'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📸 Share as Image
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('pdf'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📄 Share as PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); shareNative('text'); }}
                      className="text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      📝 Share as Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border-2 border-slate-900 bg-slate-50 text-[10px] keep-together">
        <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-300">
          <p className="font-black uppercase text-slate-900 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-700" />
            Dispatched by (Store / Warehouse Officer):
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Officer Name:</span>
              <span className="border-b border-dotted border-slate-400 flex-1 font-bold text-slate-800">Genuine Electronics Dispatch Officer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Signature:</span>
              <div className="border-b border-dashed border-slate-400 flex-1 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Date & Time:</span>
              <span className="font-mono text-slate-700">{orderDate}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-300">
          <p className="font-black uppercase text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            Received in Good Order by (Customer / Carrier):
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Recipient Name:</span>
              <div className="border-b border-dotted border-slate-400 flex-1 font-bold text-slate-800">{order.customerName || ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Signature & ID:</span>
              <div className="border-b border-dashed border-slate-400 flex-1 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold w-24">Date & Time:</span>
              <div className="border-b border-dotted border-slate-400 flex-1" />
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600 pt-1 font-semibold">
              <input type="checkbox" defaultChecked readOnly className="accent-emerald-600 rounded" />
              <span>All packages verified complete, undamaged, and received in good order.</span>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const verificationUrl = buildInvoiceVerificationUrl({
    orderNo: (order as any).orderNumber || order.id || cleanOrderNo,
    invoiceNo: currentDocRef,
    docType,
    totalAmount: docType === 'delivery' ? undefined : (order.totalAmount || grandTotal || 0),
    customerName: order.customerName,
    paymentStatus: order.paymentStatus,
  });

  const stampStatusTitle = docType === 'delivery'
    ? 'DISPATCHED & VERIFIED'
    : docType === 'proforma'
    ? 'OFFICIAL QUOTATION'
    : order.paymentStatus === 'Paid'
    ? 'PAID & VERIFIED'
    : (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'TAX INVOICE ISSUED' : 'COMMERCIAL INVOICE');

  const stampBottomMeta = storeSettings?.tin
    ? `TIN: ${storeSettings.tin} • DAR ES SALAAM, TZ`
    : docType === 'proforma' && quotationValidUntil
    ? `VALID UNTIL: ${quotationValidUntil.toUpperCase()}`
    : docType === 'delivery'
    ? `${totalUnits} UNITS • DAR ES SALAAM, TZ`
    : 'DAR ES SALAAM • TANZANIA';

  const renderFooterSealSection = () => (
    <div className="pt-3 flex justify-between items-center gap-4 text-[10px] text-slate-600 border-t-2 border-slate-900 keep-together">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <a
          href={verificationUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Click or scan to verify official electronic document online"
          className="p-1.5 bg-white rounded-lg border-2 border-slate-900 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer block shrink-0"
        >
          <QRCodeSVG
            value={verificationUrl}
            size={52}
            level="M"
          />
        </a>
        <div className="min-w-0">
          <p className="font-black text-slate-900 text-xs">Genuine Electronics Tanzania Ltd</p>
          <p className="text-[10px] text-slate-600 leading-snug">
            {docType === 'delivery'
              ? 'Scan QR Code to verify consignment dispatch & authentic packing slip online.'
              : docType === 'proforma'
              ? 'Scan QR Code to verify official quotation & validity terms online.'
              : 'Scan QR Code to verify document authenticity & fiscal status online.'}
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">
            {docType === 'tax'
              ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? 'Commercial Electronic Tax Invoice' : 'Commercial Electronic Sales Invoice')
              : docType === 'proforma'
              ? 'Official Proforma Quotation Document (Valid for 14 Days)'
              : 'Official Consignment & Delivery Manifest'}
          </p>
        </div>
      </div>

      <div className="text-right flex items-center gap-3.5 shrink-0">
        {showStamp && (
          <div
            title={`Official Verified Stamp • ${currentDocRef} • ${orderDate}`}
            className="official-stamp group border-2 border-[#0033a0] rounded-lg p-[2px] text-center text-[#0033a0] select-none rotate-[-2.5deg] hover:rotate-0 transition-transform duration-200 bg-[#eff4ff]/85 shadow-sm shrink-0 min-w-[186px] max-w-[224px]"
          >
            <div className="border border-dashed border-[#0033a0]/80 rounded-[5px] px-2.5 py-1.5 flex flex-col items-center justify-center">
              <span className="text-[7.5px] font-black uppercase tracking-[0.12em] leading-tight text-[#0033a0]">
                ★ {(storeSettings?.storeName || 'GENUINE ELECTRONICS').toUpperCase()} ★
              </span>

              <div className="w-full border-y-[1.5px] border-[#0033a0] bg-[#0033a0]/[0.07] py-0.5 my-1 px-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-[0.1em] text-[#002270] block leading-tight">
                  {stampStatusTitle}
                </span>
              </div>

              <div className="w-full space-y-0.5 text-[7.5px] font-mono font-bold text-[#002880] leading-tight">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#0033a0]/80 font-sans font-extrabold">DATE:</span>
                  <span>{orderDate.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#0033a0]/80 font-sans font-extrabold">REF:</span>
                  <span>{currentDocRef}</span>
                </div>
              </div>

              <span className="mt-1 pt-0.5 border-t border-[#0033a0]/25 w-full text-[6.5px] font-extrabold uppercase tracking-wider text-[#0033a0] leading-tight">
                {stampBottomMeta}
              </span>
            </div>
          </div>
        )}

        <div className="shrink-0">
          <div className="inline-block border-2 border-slate-900 px-3 py-1 rounded bg-slate-50 mb-1">
            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest block">
              APPROVED & AUTHORIZED
            </span>
          </div>
          <p className="font-bold text-slate-800 text-[10px]">
            {docType === 'delivery' ? 'Store Logistics & Dispatch Dept.' : 'Financial Operations & Audit Dept.'}
          </p>
          <p className="text-[9px] text-slate-500">Dar es Salaam, Tanzania</p>
        </div>
      </div>
    </div>
  );

  const renderPageFooter = (pageNumber: number, totalPages: number) => (
    <div className="mt-auto pt-2.5 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
      <div className="flex items-center gap-2 font-medium truncate">
        <span className="font-bold text-slate-700">{storeSettings?.storeName || 'Genuine Electronics Tanzania Ltd'}</span>
        <span>•</span>
        <span className="font-mono text-slate-700">{currentDocRef}</span>
        <span>•</span>
        <span>Order {order.id}</span>
      </div>
      <div className="font-black text-slate-800 tracking-wide shrink-0 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">
        Page {pageNumber} of {totalPages}
      </div>
    </div>
  );

  const renderInvoiceA4Page = (
    plan: InvoicePagePlan,
    totalPages: number,
    options: { interactive?: boolean; assignRef?: (el: HTMLDivElement | null) => void } = {}
  ) => {
    const { interactive = false, assignRef } = options;

    return (
      <div
        ref={assignRef}
        className="invoice-a4-page bg-white text-slate-900 text-xs box-border flex flex-col overflow-hidden"
        style={{
          width: `${A4_WIDTH_PX}px`,
          minWidth: `${A4_WIDTH_PX}px`,
          maxWidth: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          minHeight: `${A4_HEIGHT_PX}px`,
          maxHeight: `${A4_HEIGHT_PX}px`,
          padding: `${PAGE_PAD_TOP}px ${PAGE_PAD_X}px ${PAGE_PAD_BOTTOM}px ${PAGE_PAD_X}px`,
        }}
      >
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {plan.isFirstPage
            ? renderPage1Header(interactive)
            : renderContinuationHeader(plan.pageNumber, totalPages)}

          {(plan.items.length > 0 || (plan.isFirstPage && orderItems.length === 0)) &&
            renderItemsTable(plan.items, false)}

          {plan.includeLoan && renderLoanSection()}
          {plan.includeTotals && renderTotalsSection()}
          {plan.includePaymentOrSig && renderPaymentOrSignaturesSection(interactive)}
          {plan.includeFooterSeal && renderFooterSealSection()}
        </div>

        {renderPageFooter(plan.pageNumber, totalPages)}
      </div>
    );
  };

  return (
    <div className={`invoice-generator-container flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
      {/* Embedded CSS Print Styles specifically configured for crisp isolated multi-page A4 printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
          }

          .ge-invoice-print-portal {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .ge-invoice-print-portal .invoice-a4-page {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 296.4mm !important;
            min-height: 296.4mm !important;
            max-height: 296.4mm !important;
            margin: 0 auto !important;
            padding: 7.4mm 8.5mm 6.3mm 8.5mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .ge-invoice-print-portal .invoice-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Offscreen Measurement Container (Canonical 794px width matching actual A4 sheet text flow) */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="no-print fixed top-0 pointer-events-none opacity-0 bg-white text-slate-900 text-xs box-border"
        style={{
          left: '-15000px',
          width: `${A4_WIDTH_PX}px`,
          padding: `0 ${PAGE_PAD_X}px`,
        }}
      >
        <div data-measure="header-p1">{renderPage1Header(false)}</div>
        <div data-measure="header-cont">{renderContinuationHeader(2, 2)}</div>
        <div data-measure="table-container" className="mt-3">
          {renderItemsTable(
            orderItems.map((item, idx) => ({ item, originalIndex: idx })),
            true
          )}
        </div>
        {docType !== 'delivery' && order.isLoan && (
          <div data-measure="loan" className="mt-3">{renderLoanSection()}</div>
        )}
        <div data-measure="totals" className="mt-3">{renderTotalsSection()}</div>
        <div data-measure="payment-or-sig" className="mt-3">{renderPaymentOrSignaturesSection(false)}</div>
        <div data-measure="footer-seal" className="mt-3">{renderFooterSealSection()}</div>
      </div>

      {/* Dedicated Isolated Print Portal (Mounted on document.body so Direct Print prints ONLY the invoice) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            id="ge-invoice-print-portal"
            className="ge-invoice-print-portal printable-invoice-root hidden print:block bg-white text-slate-900"
            aria-hidden="true"
          >
            {pagePlans.map((plan) => (
              <React.Fragment key={`print-page-${plan.pageNumber}`}>
                {renderInvoiceA4Page(plan, pagePlans.length, { interactive: false })}
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}

      {/* Pending Payment Notification Banner */}
      {showControls && order.paymentStatus !== 'Paid' && order.status !== 'Completed' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-semibold text-amber-300 no-print flex items-center justify-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Payment Confirmation Pending — Displaying Proforma Invoice for Order #{order.id}. Official Payment Receipt unlocks once payment is confirmed.</span>
        </div>
      )}

      {/* Action Controls Bar (Hidden during physical printing) */}
      {showControls && (
        <div className="no-print bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-auto flex items-center justify-center shrink-0">
              <img src={BRAND_LOGO_URL} alt="Genuine Electronics" className="h-8 w-auto max-w-[100px] object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-extrabold text-sm tracking-tight">
                  {docType === 'tax' ? (includeVat ? 'Tax Invoice' : 'Commercial Invoice') : docType === 'proforma' ? 'Proforma Invoice' : 'Delivery Note'} — {invoiceNo}
                </h2>
                <button
                  onClick={copyInvoiceText}
                  title="Copy Invoice Number"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedInvoiceNo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md">
                  {pagePlans.length} {pagePlans.length === 1 ? 'Page' : 'Pages'} • A4
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {docType === 'tax'
                  ? (includeVat && activeVatPercentage > 0 && calculatedTax > 0 ? `Commercial Tax Invoice (${activeVatPercentage}% VAT Included)` : 'Commercial Sales Invoice')
                  : docType === 'proforma'
                  ? 'Formal Price Quotation & Proforma (Valid for 14 Days)'
                  : 'Official Consignment Packing Slip & Delivery Verification'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Document Type Switcher (Administrative Option - Hidden for Clients) */}
            {!hideTypeSwitcher && !isClientView && (
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDocType('tax')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    docType === 'tax' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('proforma')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    docType === 'proforma' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Proforma
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('delivery')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    docType === 'delivery' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Delivery Note
                </button>
              </div>
            )}

            {/* VAT Toggle Switch (Administrative Option - Hidden for Clients) */}
            {!hideTypeSwitcher && !isClientView && docType !== 'delivery' && (
              <label
                title={`Toggle VAT (${baseOrderVatPct}%) Inclusion`}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer select-none border border-slate-700 transition-all active:scale-95"
              >
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center gap-1">
                  <Percent className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-[11px] text-slate-200">
                    VAT ({baseOrderVatPct}%)
                  </span>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${
                  includeVat ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {includeVat ? 'Active' : 'Off'}
                </span>
              </label>
            )}

            {/* Official Stamp Toggle Switch */}
            {!isClientView && (
              <label
                title="Toggle Official Verification Stamp / Seal on Document"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer select-none border border-slate-700 transition-all active:scale-95"
              >
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center gap-1">
                  <Stamp className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-[11px] text-slate-200">
                    Official Stamp
                  </span>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${
                  showStamp ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {showStamp ? 'ON' : 'OFF'}
                </span>
              </label>
            )}

            {/* Document Date Editor Action Bar Button */}
            {!isClientView && (
              <button
                type="button"
                onClick={() => setIsEditingDate(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs select-none border transition-all active:scale-95 cursor-pointer ${
                  isEditingDate
                    ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Edit Document Issue Date / Quotation Expiry"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-[11px]">Date</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${
                  isEditingDate ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {isEditingDate ? 'Done' : 'Edit'}
                </span>
              </button>
            )}

            {/* Share Invoice Dropdown in Action Bar */}
            <div className="relative" ref={shareDropdownActionRef}>
              <button
                type="button"
                onClick={handleShareMenuClick}
                disabled={isSharing}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
                title="Share invoice via WhatsApp, PDF, Image or Text"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>

              {showShareFormatModal && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-1.5 space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1">Export & Share Format</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('pdf'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📄</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as PDF</div>
                      <div className="text-[9px] text-slate-500 font-normal">Paginated A4 Document ({pagePlans.length}p)</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('image'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📸</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as Image (PNG)</div>
                      <div className="text-[9px] text-slate-500 font-normal">Crisp paginated A4 sheets</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); shareNative('text'); }}
                    className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm">📝</span>
                    <div>
                      <div className="font-extrabold text-slate-900">Share as Text</div>
                      <div className="text-[9px] text-slate-500 font-normal">WhatsApp summary format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage || isGeneratingPDF}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 border border-slate-700 shadow-sm cursor-pointer"
              title="Download paginated high-resolution PNG image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>{isGeneratingImage ? 'Exporting...' : 'Save Image'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isGeneratingImage}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPDF ? 'Exporting...' : 'Save PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {docType === 'delivery' ? 'Delivery Note' : docType === 'proforma' ? 'Proforma' : 'Invoice'}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paginated A4 Screen Preview (Hidden during @media print where .ge-invoice-print-portal prints) */}
      <div
        ref={previewScrollRef}
        className="ge-invoice-screen-preview no-print flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-900/90 dark:bg-slate-950 flex flex-col items-center gap-6 min-h-0 w-full touch-pan-y custom-scrollbar"
      >
        {pagePlans.map((plan, idx) => (
          <div key={`screen-page-${plan.pageNumber}`} className="flex flex-col items-center gap-1.5 shrink-0">
            {pagePlans.length > 1 && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 border border-slate-700/80 px-3 py-0.5 rounded-full">
                Page {plan.pageNumber} of {pagePlans.length}
              </div>
            )}
            <div
              className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-700/60 bg-white"
              style={{
                width: `${Math.round(A4_WIDTH_PX * previewScale)}px`,
                height: `${Math.round(A4_HEIGHT_PX * previewScale)}px`,
              }}
            >
              <div
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  height: `${A4_HEIGHT_PX}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                {renderInvoiceA4Page(plan, pagePlans.length, {
                  interactive: true,
                  assignRef: (el) => {
                    pageRefs.current[idx] = el;
                  },
                })}
              </div>
            </div>
          </div>
        ))}
        <div className="h-4 shrink-0" />
      </div>
    </div>
  );
};
