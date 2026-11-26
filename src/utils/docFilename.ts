export interface BuildDocNameParams {
  customerName?: string | null;
  docNo?: string | null;
  docCategory?: 'invoice' | 'receipt';
  pageSuffix?: string;
}

const sanitizeFilenameSegment = (value: string): string => {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Formats invoice and receipt export/share names as:
 *   Invoices: CUSTOMER NAME - INVO-<INVOICE NO> - GENUINE TRUST
 *   Receipts: CUSTOMER NAME - RECEIPT-<RECEIPT NO> - GENUINE TRUST
 * Safe for Windows, macOS, Linux, iOS, and Android filesystems.
 */
export function buildDocumentBaseName({
  customerName,
  docNo,
  docCategory = 'invoice',
  pageSuffix,
}: BuildDocNameParams): string {
  const safeCustomer =
    sanitizeFilenameSegment(customerName || '').toUpperCase() || 'WALK-IN CUSTOMER';
  const rawDoc =
    sanitizeFilenameSegment((docNo || '0000').replace(/^#+/, '')).toUpperCase() || '0000';
  const prefix = docCategory === 'receipt' ? 'RECEIPT-' : 'INVO-';
  const docPart = rawDoc.startsWith(prefix) ? rawDoc : `${prefix}${rawDoc}`;
  const suffix = pageSuffix ? ` (${sanitizeFilenameSegment(pageSuffix)})` : '';
  return `${safeCustomer} - ${docPart} - GENUINE TRUST${suffix}`;
}

export function buildDocumentExportFilename({
  customerName,
  docNo,
  docCategory = 'invoice',
  pageSuffix,
  extension,
}: BuildDocNameParams & { extension: 'pdf' | 'png' }): string {
  return `${buildDocumentBaseName({ customerName, docNo, docCategory, pageSuffix })}.${extension}`;
}

/**
 * Temporarily sets document.title before window.print() so browser "Save as PDF"
 * defaults to the formatted document name, then restores the previous title.
 */
export function withTemporaryPrintTitle(docTitle: string, printAction: () => void): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    printAction();
    return;
  }

  const previousTitle = document.title;
  document.title = docTitle;

  let restored = false;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };

  window.addEventListener('afterprint', restoreTitle, { once: true });
  try {
    printAction();
  } finally {
    window.setTimeout(restoreTitle, 2000);
  }
}
