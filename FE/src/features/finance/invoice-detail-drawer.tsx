'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Invoice, Transaction } from '@/entities/invoice';
import { PaymentProgressBar } from './payment-progress-bar';
import { formatVND, formatDate, formatDateTime } from '@/shared/lib/utils';
import {
  Receipt,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';

interface Props {
  invoice: Invoice | null;
  transactions?: Transaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDrawer({
  invoice,
  transactions = [],
  open,
  onOpenChange,
}: Props) {
  if (!invoice) return null;

  const invoiceTransactions = transactions.filter(
    (t) => t.invoice_id === invoice.id || (invoice.transactions && invoice.transactions.some((it) => it.id === t.id))
  );

  const totalAmount = parseFloat(invoice.amount) || 0;
  const paidAmount = invoiceTransactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Receipt className="h-5 w-5 text-blue-600" />
              Chi Tiết Hóa Đơn & Tiến Trình Thu Tiền
            </DialogTitle>
            <Badge
              variant={
                invoice.status === 'PAID'
                  ? 'success'
                  : invoice.status === 'PARTIAL'
                  ? 'warning'
                  : invoice.status === 'OVERDUE'
                  ? 'destructive'
                  : 'secondary'
              }
              dot
            >
              {invoice.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Mã hóa đơn: <span className="font-mono font-bold text-slate-800">{invoice.invoice_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Thông tin hóa đơn */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Ngày Phát Hành</span>
              <div className="mt-0.5 flex items-center gap-1 font-medium text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(invoice.issued_date)}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Hạn Thanh Toán</span>
              <div className="mt-0.5 flex items-center gap-1 font-medium text-rose-600">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(invoice.due_date)}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Hợp Đồng Liên Kết</span>
              <div className="mt-0.5 font-mono font-bold text-blue-600 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {invoice.order_id ? `#${invoice.order_id.slice(0, 8)}` : invoice.repair_order_id ? `RO-${invoice.repair_order_id.slice(0, 6)}` : 'Vãng lai'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Nguồn Thu</span>
              <div className="mt-0.5 font-semibold text-slate-800 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {invoice.order_id ? 'Bán Xe (Sales)' : invoice.repair_order_id ? 'Xưởng Dịch Vụ' : 'Thu Khác'}
              </div>
            </div>
          </div>

          {/* Thanh Tiến Độ Thu Tiền Lũy Kế */}
          <PaymentProgressBar
            totalAmount={totalAmount}
            paidAmount={paidAmount}
          />

          {/* Transaction Timeline (Lịch Sử Các Đợt Thu Tiền) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Lịch Sử Các Đợt Nộp Tiền (Transaction Timeline)
              </h5>
              <span className="text-xs font-semibold text-slate-500">
                {invoiceTransactions.length} giao dịch
              </span>
            </div>

            {invoiceTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Chưa có giao dịch thanh toán nào được ghi nhận cho hóa đơn này.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {invoiceTransactions.map((tx) => (
                  <div key={tx.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-emerald-600">
                            +{formatVND(tx.amount)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {tx.payment_method}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTime(tx.transaction_date)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        {tx.reference_code && (
                          <div>
                            Mã đối soát: <span className="font-mono font-bold text-blue-600">{tx.reference_code}</span>
                          </div>
                        )}
                        {tx.note && (
                          <div className="text-slate-500 italic">
                            &quot;{tx.note}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
