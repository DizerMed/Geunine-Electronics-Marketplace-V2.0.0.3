import QRCode from 'qrcode';

export interface OrderSummaryItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  total?: number;
}

export interface OrderSummaryData {
  orderNo: string;           // e.g., "abce3467", "ORD-9821", "#POS-1049"
  receiptNo: string;         // e.g., "xewfghuii", "RCT-88210"
  orderId?: string;          // internal DB or reference ID
  totalAmount: number;       // total price in TZS
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  itemsCount?: number;
  customerName?: string;
  customerPhone?: string;
  createdAt?: string | Date;
  paymentMethod?: string;
  cashierName?: string;
  storeName?: string;
  storeTin?: string;
  storeVrn?: string;
  items?: OrderSummaryItem[];
  verificationHash?: string;
  status?: string;
}

export interface QrCodeImageOptions {
  size?: number;             // Output image width/height in px (default: 240)
  margin?: number;           // Quiet zone margin around QR (default: 1)
  darkColor?: string;        // Hex color for foreground (default: "#000000")
  lightColor?: string;       // Hex color for background (default: "#ffffff")
  baseUrl?: string;          // Custom base URL or domain override
}

export interface QrCodeConversionResult {
  qrCodeDataUrl: string;     // PNG Data URL string ("data:image/png;base64,...")
  qrCodeSvg: string;         // Inline SVG markup string
  verificationUrl: string;   // Full URL string e.g. "https://.../receipt/?orderNo=abce3467&receipt=xewfghuii"
  verificationHash: string;  // Cryptographic signature hash
  summary: OrderSummaryData;
}

/**
 * Generates a deterministic security signature hash for receipt verification
 */
export function generateReceiptSecurityHash(summary: Partial<OrderSummaryData>): string {
  const cleanOrder = (summary.orderNo || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanReceipt = (summary.receiptNo || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const total = Math.round(Number(summary.totalAmount || 0));
  const rawString = `${cleanOrder}:${cleanReceipt}:${total}:GE_SECURE_VERIFY_2026`;
  
  // Simple fast checksum hash for frontend tamper check
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `SEC-${hex.toUpperCase().slice(0, 8)}`;
}

/**
 * Builds the online receipt verification URL in the requested format:
 * .../receipt/?orderNo=abce3467&receipt=xewfghuii
 */
export function buildReceiptVerificationUrl(
  summary: OrderSummaryData,
  baseUrl?: string
): string {
  const cleanOrderNo = (summary.orderNo || '').replace(/^#/, '').trim();
  const cleanReceiptNo = (summary.receiptNo || summary.orderNo || '').replace(/^#/, '').trim();
  
  let origin = baseUrl;
  if (!origin) {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin;
    } else {
      origin = 'https://genuine-electronics.com';
    }
  }

  // Ensure origin doesn't end with slash
  origin = origin.replace(/\/+$/, '');

  const params = new URLSearchParams();
  params.set('orderNo', cleanOrderNo);
  params.set('receipt', cleanReceiptNo);
  if (summary.totalAmount) {
    params.set('total', summary.totalAmount.toString());
  }
  const hash = summary.verificationHash || generateReceiptSecurityHash(summary);
  params.set('v', hash);

  return `${origin}/receipt/?${params.toString()}`;
}

/**
 * Core Service Function: Converts order summary data into a QR code image
 * for display on receipts, allowing customers to scan and verify purchase details online.
 */
export async function convertOrderSummaryToQrCodeImage(
  summary: OrderSummaryData,
  options: QrCodeImageOptions = {}
): Promise<QrCodeConversionResult> {
  const hash = summary.verificationHash || generateReceiptSecurityHash(summary);
  const normalizedSummary: OrderSummaryData = {
    ...summary,
    verificationHash: hash
  };

  const verificationUrl = buildReceiptVerificationUrl(normalizedSummary, options.baseUrl);

  const qrSize = options.size || 240;
  const qrMargin = options.margin !== undefined ? options.margin : 1;
  const darkColor = options.darkColor || '#000000';
  const lightColor = options.lightColor || '#ffffff';

  // Generate PNG Data URL image
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: qrSize,
    margin: qrMargin,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel: 'M'
  });

  // Generate SVG string
  const qrCodeSvg = await QRCode.toString(verificationUrl, {
    type: 'svg',
    width: qrSize,
    margin: qrMargin,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel: 'M'
  });

  return {
    qrCodeDataUrl,
    qrCodeSvg,
    verificationUrl,
    verificationHash: hash,
    summary: normalizedSummary
  };

}

/**
 * Synchronous / Direct helper to convert text or URL directly into a QR code Data URL image
 */
export async function generateQrCodeDataUrl(
  textOrUrl: string,
  options: QrCodeImageOptions = {}
): Promise<string> {
  return await QRCode.toDataURL(textOrUrl, {
    width: options.size || 200,
    margin: options.margin !== undefined ? options.margin : 1,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}

/**
 * Parses query parameters from URL or Search string
 * E.g., /receipt/?orderNo=abce3467&receipt=xewfghuii
 */
export function parseReceiptQueryParams(
  urlOrParams?: string | URLSearchParams
): {
  orderNo: string | null;
  receiptNo: string | null;
  total: number | null;
  hash: string | null;
} {
  let searchParams: URLSearchParams;

  if (urlOrParams instanceof URLSearchParams) {
    searchParams = urlOrParams;
  } else if (typeof urlOrParams === 'string') {
    if (urlOrParams.includes('?')) {
      const queryString = urlOrParams.split('?')[1];
      searchParams = new URLSearchParams(queryString);
    } else {
      searchParams = new URLSearchParams(urlOrParams);
    }
  } else if (typeof window !== 'undefined') {
    searchParams = new URLSearchParams(window.location.search);
  } else {
    searchParams = new URLSearchParams('');
  }

  const orderNo = searchParams.get('orderNo') || searchParams.get('order') || searchParams.get('id') || searchParams.get('order_id');
  const receiptNo = searchParams.get('receipt') || searchParams.get('receiptNo') || searchParams.get('rct') || orderNo;
  const totalRaw = searchParams.get('total') || searchParams.get('amount');
  const hash = searchParams.get('v') || searchParams.get('hash') || searchParams.get('sig');

  return {
    orderNo: orderNo ? orderNo.trim() : null,
    receiptNo: receiptNo ? receiptNo.trim() : null,
    total: totalRaw ? parseFloat(totalRaw) : null,
    hash: hash ? hash.trim() : null
  };
}

export interface InvoiceVerificationData {
  orderNo: string;
  invoiceNo?: string;
  docType?: 'tax' | 'proforma' | 'delivery';
  totalAmount?: number;
  customerName?: string;
  paymentStatus?: string;
  verificationHash?: string;
}

/**
 * Builds the online invoice verification URL for Invoices, Proforma & Delivery Notes:
 * .../invoice/?orderNo=abce3467&invoiceNo=INV-abce3467&type=tax
 */
export function buildInvoiceVerificationUrl(
  summary: InvoiceVerificationData,
  baseUrl?: string
): string {
  const cleanOrderNo = (summary.orderNo || '').replace(/^#/, '').trim();
  const cleanInvoiceNo = (summary.invoiceNo || cleanOrderNo).replace(/^#/, '').trim();
  const docType = summary.docType || 'tax';

  let origin = baseUrl;
  if (!origin) {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin;
    } else {
      origin = 'https://genuine-electronics.com';
    }
  }

  // Ensure origin doesn't end with slash
  origin = origin.replace(/\/+$/, '');

  const params = new URLSearchParams();
  params.set('doc', 'invoice');
  params.set('orderNo', cleanOrderNo);
  params.set('invoiceNo', cleanInvoiceNo);
  params.set('type', docType);

  // Derivery Note should not display prices or payment totals
  if (docType !== 'delivery' && summary.totalAmount) {
    params.set('total', Math.round(summary.totalAmount).toString());
  }

  if (summary.customerName) {
    params.set('customer', summary.customerName.trim());
  }

  const hash = summary.verificationHash || generateReceiptSecurityHash({
    orderNo: cleanOrderNo,
    receiptNo: cleanInvoiceNo,
    totalAmount: docType === 'delivery' ? 0 : (summary.totalAmount || 0)
  });
  params.set('v', hash);

  return `${origin}/invoice/?${params.toString()}`;
}

/**
 * Parses query parameters specifically for Invoice / Delivery Note verification:
 * e.g., /invoice/?orderNo=abce3467&invoiceNo=INV-abce3467&type=delivery
 */
export function parseInvoiceQueryParams(
  urlOrParams?: string | URLSearchParams
): {
  orderNo: string | null;
  invoiceNo: string | null;
  docType: 'tax' | 'proforma' | 'delivery';
  total: number | null;
  customer: string | null;
  hash: string | null;
} {
  let searchParams: URLSearchParams;

  if (urlOrParams instanceof URLSearchParams) {
    searchParams = urlOrParams;
  } else if (typeof urlOrParams === 'string') {
    if (urlOrParams.includes('?')) {
      const queryString = urlOrParams.split('?')[1];
      searchParams = new URLSearchParams(queryString);
    } else {
      searchParams = new URLSearchParams(urlOrParams);
    }
  } else if (typeof window !== 'undefined') {
    searchParams = new URLSearchParams(window.location.search);
  } else {
    searchParams = new URLSearchParams('');
  }

  const orderNo = searchParams.get('orderNo') || searchParams.get('order') || searchParams.get('id') || searchParams.get('order_id');
  const invoiceNo = searchParams.get('invoiceNo') || searchParams.get('invoice') || searchParams.get('inv') || searchParams.get('receipt') || orderNo;
  const rawType = (searchParams.get('type') || searchParams.get('docType') || searchParams.get('doc_type') || '').toLowerCase();

  let docType: 'tax' | 'proforma' | 'delivery' = 'tax';
  const cleanInvUpper = (invoiceNo || '').toUpperCase();
  if (rawType.includes('delivery') || rawType === 'dn' || cleanInvUpper.startsWith('DN-') || cleanInvUpper.startsWith('DN_')) {
    docType = 'delivery';
  } else if (rawType.includes('proforma') || rawType === 'pro' || cleanInvUpper.startsWith('PRO-') || cleanInvUpper.startsWith('PRO_')) {
    docType = 'proforma';
  }

  const totalRaw = searchParams.get('total') || searchParams.get('amount');
  const customer = searchParams.get('customer') || searchParams.get('name');
  const hash = searchParams.get('v') || searchParams.get('hash') || searchParams.get('sig');

  return {
    orderNo: orderNo ? orderNo.trim() : null,
    invoiceNo: invoiceNo ? invoiceNo.trim() : null,
    docType,
    total: docType === 'delivery' ? null : (totalRaw ? parseFloat(totalRaw) : null),
    customer: customer ? customer.trim() : null,
    hash: hash ? hash.trim() : null
  };
}

/**
 * Client-side helper to call the online invoice verification API endpoint
 */
export async function fetchOnlineInvoiceVerification(
  orderNo: string,
  invoiceNo: string,
  docType?: string,
  extraParams?: { customer?: string; total?: number | null }
): Promise<{
  isVerified: boolean;
  status: 'VERIFIED' | 'MATCH_FOUND' | 'UNVERIFIED_DEMO' | 'NOT_FOUND';
  docType: 'tax' | 'proforma' | 'delivery';
  order: any | null;
  storeInfo: any | null;
  message: string;
}> {
  try {
    const cleanOrder = encodeURIComponent(orderNo || '');
    const cleanInvoice = encodeURIComponent(invoiceNo || '');
    const cleanType = encodeURIComponent(docType || 'tax');
    let url = `/api/verify-invoice?orderNo=${cleanOrder}&invoiceNo=${cleanInvoice}&docType=${cleanType}`;
    if (extraParams?.customer) {
      url += `&customer=${encodeURIComponent(extraParams.customer)}`;
    }
    if (extraParams?.total !== undefined && extraParams?.total !== null) {
      url += `&total=${encodeURIComponent(extraParams.total.toString())}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch online invoice verification:', err);
  }

  return {
    isVerified: false,
    status: 'NOT_FOUND',
    docType: (docType as any) || 'tax',
    order: null,
    storeInfo: null,
    message: 'Could not connect to online invoice verification service.'
  };
}

/**
 * Client-side helper to call the online verification API endpoint
 */
export async function fetchOnlineReceiptVerification(
  orderNo: string,
  receiptNo: string
): Promise<{
  isVerified: boolean;
  status: 'VERIFIED' | 'MATCH_FOUND' | 'UNVERIFIED_DEMO' | 'NOT_FOUND';
  receipt: any | null;
  storeInfo: any | null;
  message: string;
}> {
  try {
    const cleanOrder = encodeURIComponent(orderNo || '');
    const cleanReceipt = encodeURIComponent(receiptNo || '');
    const res = await fetch(`/api/verify-receipt?orderNo=${cleanOrder}&receipt=${cleanReceipt}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch online receipt verification:', err);
  }

  return {
    isVerified: false,
    status: 'NOT_FOUND',
    receipt: null,
    storeInfo: null,
    message: 'Could not connect to online verification service.'
  };
}
