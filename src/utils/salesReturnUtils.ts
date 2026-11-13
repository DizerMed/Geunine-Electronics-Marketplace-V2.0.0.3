import { POSTransaction, SaleReturn } from '../types';

export function isCompletedSaleReturn(ret: SaleReturn): boolean {
  const status = String(ret.refundStatus || ret.refund_status || 'Completed').trim().toLowerCase();
  return status !== 'pending' && status !== 'cancelled';
}

export function getSaleReturnAmount(ret: SaleReturn): number {
  const raw = ret.totalRefundAmount ?? ret.total_refund_amount ?? 0;
  return Math.max(0, Number(raw) || 0);
}

export function getSaleReturnCreatedAt(ret: SaleReturn): string {
  return ret.createdAt || ret.created_at || '';
}

export function getSaleReturnMethod(ret: SaleReturn): string {
  return ret.refundMethod || ret.refund_method || 'Cash';
}

export function getSaleReturnReceiptKey(ret: SaleReturn): string {
  return String(ret.receiptNumber || ret.receipt_number || '').trim().toLowerCase();
}

export function getSaleReturnReferenceId(ret: SaleReturn): string {
  return String(ret.referenceId || ret.reference_id || '').trim().toLowerCase();
}

export function matchSaleReturnToTransaction(ret: SaleReturn, tx: POSTransaction): boolean {
  const txId = String(tx.id || '').trim().toLowerCase();
  const txReceipt = String(tx.receiptNumber || tx.receipt_number || '').trim().toLowerCase();

  const refId = getSaleReturnReferenceId(ret);
  const receiptKey = getSaleReturnReceiptKey(ret);

  if (refId && (refId === txId || (txReceipt && refId === txReceipt))) {
    return true;
  }
  if (receiptKey && (receiptKey === txId || (txReceipt && receiptKey === txReceipt))) {
    return true;
  }
  return false;
}

export interface TransactionReturnSummary {
  returnedAmount: number;
  netAmount: number;
  isFullyRefunded: boolean;
  isPartiallyRefunded: boolean;
  returns: SaleReturn[];
}

export function buildTransactionReturnSummaryMap(
  transactions: POSTransaction[],
  salesReturns: SaleReturn[]
): {
  byTxId: Record<string, TransactionReturnSummary>;
  unlinkedReturns: SaleReturn[];
} {
  const completedReturns = (salesReturns || []).filter(isCompletedSaleReturn);
  const byTxId: Record<string, TransactionReturnSummary> = {};
  const matchedReturnIds = new Set<string>();

  for (const tx of transactions || []) {
    const gross = Math.max(0, Number(tx.total ?? tx.totalAmount ?? 0) || 0);
    const matching = completedReturns.filter((r) => matchSaleReturnToTransaction(r, tx));
    matching.forEach((r) => {
      if (r.id) matchedReturnIds.add(r.id);
    });

    const returnedAmount = matching.reduce((sum, r) => sum + getSaleReturnAmount(r), 0);
    const netAmount = Math.max(0, gross - returnedAmount);
    const isFullyRefunded =
      tx.status === 'Refunded' || (gross > 0 && returnedAmount >= gross) || (matching.length > 0 && netAmount === 0);
    const isPartiallyRefunded = !isFullyRefunded && returnedAmount > 0;

    byTxId[tx.id] = {
      returnedAmount,
      netAmount,
      isFullyRefunded,
      isPartiallyRefunded,
      returns: matching,
    };
  }

  const unlinkedReturns = completedReturns.filter((r) => !r.id || !matchedReturnIds.has(r.id));
  return { byTxId, unlinkedReturns };
}
