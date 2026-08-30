'use client';

import React, { useState, useMemo } from 'react';
import { useInvoices, useTransactions, Invoice, Transaction } from '@/entities/invoice';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { CreatePaymentDialog } from '@/features/finance/create-payment-dialog';
import { InvoiceDetailDrawer } from '@/features/finance/invoice-detail-drawer';
import { PaymentProgressBar } from '@/features/finance/payment-progress-bar';
import { formatVND, formatDate, formatDateTime } from '@/shared/lib/utils';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Eye,
  CreditCard,
  Building2,
} from 'lucide-react';

export function FinanceView() {
  const { data: invoices = [], isLoading: isInvoicesLoading } = useInvoices();
  const { data: transactions = [], isLoading: isTxsLoading } = useTransactions();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const handleOpenPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleOpenDetail = (invoice: Invoice) => {
    setDetailInvoice(invoice);
    setDetailDrawerOpen(true);
  };

  // 1. Tính toán các chỉ số KPI Tài Chính & Dòng Tiền
  const totalInvoicesCount = invoices.length;
  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const partialCount = invoices.filter((i) => i.status === 'PARTIAL').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  const totalInvoiceValue = invoices.reduce(
    (sum, i) => sum + (parseFloat(i.amount) || 0),
    0
  );

  const totalCollectedCash = transactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalOutstandingReceivables = Math.max(0, totalInvoiceValue - totalCollectedCash);

  // 2. Lọc Hóa Đơn theo Filter Pill
  const filteredInvoices = useMemo(() => {
    if (selectedStatus === 'ALL') return invoices;
    return invoices.filter((i) => i.status === selectedStatus);
  }, [invoices, selectedStatus]);

  const invoiceColumns: ColumnDef<Invoice>[] = [
    {
      header: 'Số Hóa Đơn & Nguồn',
      accessorKey: 'invoice_number',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-indigo-500">
            {row.invoice_number}
          </span>
          <div className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1 font-mono">
            <Building2 className="h-3 w-3 text-muted-foreground/60" />
            {row.order_id
              ? `Bán xe #${row.order_id.slice(0, 8)}`
              : row.repair_order_id
              ? `Dịch vụ #${row.repair_order_id.slice(0, 6)}`
              : 'Thu trực tiếp'}
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'status',
      cell: (row) => {
        const variant =
          row.status === 'PAID'
            ? 'success'
            : row.status === 'PARTIAL'
            ? 'warning'
            : row.status === 'OVERDUE'
            ? 'destructive'
            : 'secondary';

        return (
          <Badge variant={variant} dot className="text-[10px]">
            {row.status}
          </Badge>
        );
      },
    },
    {
      header: 'Tổng Giá Trị',
      accessorKey: 'amount',
      cell: (row) => (
        <span className="text-xs font-bold text-foreground font-mono">
          {formatVND(row.amount)}
        </span>
      ),
    },
    {
      header: 'Tiến Độ Thu Tiền (Progress)',
      cell: (row) => {
        const paid = transactions
          .filter((t) => t.invoice_id === row.id && t.status === 'COMPLETED')
          .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        return (
          <PaymentProgressBar
            totalAmount={row.amount}
            paidAmount={paid}
            isCompact
          />
        );
      },
    },
    {
      header: 'Hạn Thanh Toán',
      accessorKey: 'due_date',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.due_date)}</span>,
    },
    {
      header: 'Thao Tác Kế Toán',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-lg text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
            onClick={() => handleOpenPayment(row)}
            disabled={row.status === 'PAID'}
          >
            <DollarSign className="mr-1 h-3.5 w-3.5" />
            {row.status === 'PAID' ? 'Đã thu đủ' : 'Thu tiền'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => handleOpenDetail(row)}
            title="Xem chi tiết & Timeline giao dịch"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const transactionColumns: ColumnDef<Transaction>[] = [
    {
      header: 'Mã Đối Soát (Reference Code)',
      accessorKey: 'reference_code',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-indigo-500">
            {row.reference_code || `#${row.id.slice(0, 8)}`}
          </span>
          <div className="text-[10px] font-mono text-muted-foreground">ID: {row.id.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      header: 'Phương Thức',
      accessorKey: 'payment_method',
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] font-semibold border-border/60">
          {row.payment_method}
        </Badge>
      ),
    },
    {
      header: 'Số Tiền Thực Thu',
      accessorKey: 'amount',
      cell: (row) => (
        <span className="text-xs font-black text-emerald-500 font-mono">
          +{formatVND(row.amount)}
        </span>
      ),
    },
    {
      header: 'Thời Gian Giao Dịch',
      accessorKey: 'transaction_date',
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono">{formatDateTime(row.transaction_date)}</span>
      ),
    },
    {
      header: 'Ghi Chú Kế Toán',
      accessorKey: 'note',
      cell: (row) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {row.note || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500">
            <Receipt className="h-4.5 w-4.5" />
          </div>
          Tài Chính, Hóa Đơn & Sổ Cái Dòng Tiền (Finance)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Kiểm soát toàn bộ công nợ hóa đơn, ghi nhận dòng tiền thực tế với mã đối soát Idempotency và thanh lũy kế trực quan.
        </p>
      </div>

      {/* KPI Dòng Tiền & Công Nợ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tổng Hóa Đơn Phát Hành
          </p>
          <h4 className="text-xl font-black text-foreground font-mono mt-1">
            {formatVND(totalInvoiceValue)}
          </h4>
          <p className="mt-2 text-[11px] text-indigo-500 font-semibold font-mono">
            {totalInvoicesCount} hóa đơn ({paidCount} đã tất toán)
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Tiền Thực Thu (Đã Vào Két)
              </p>
              <h4 className="text-xl font-black text-emerald-500 font-mono mt-1">
                {formatVND(totalCollectedCash)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-500 font-semibold font-mono">
            {transactions.length} giao dịch đã ghi nhận
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-600 via-rose-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Công Nợ Còn Phải Thu
              </p>
              <h4 className="text-xl font-black text-rose-500 font-mono mt-1">
                {formatVND(totalOutstandingReceivables)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-mono">
            {unpaidCount} chưa thu / {partialCount} thu 1 phần
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-600 via-amber-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Hóa Đơn Quá Hạn
              </p>
              <h4 className="text-xl font-black text-amber-500 font-mono mt-1">
                {overdueCount} hóa đơn
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Cần kế toán đôn đốc nhắc nợ</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="invoices" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Sổ Cái Hóa Đơn ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            Nhật Ký Dòng Tiền & Đối Soát ({transactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Tất Cả', value: 'ALL', count: totalInvoicesCount },
              { label: 'Chưa Thu (UNPAID)', value: 'UNPAID', count: unpaidCount },
              { label: 'Thu Một Phần (PARTIAL)', value: 'PARTIAL', count: partialCount },
              { label: 'Đã Thu Đủ (PAID)', value: 'PAID', count: paidCount },
              { label: 'Quá Hạn (OVERDUE)', value: 'OVERDUE', count: overdueCount },
            ].map((pill) => (
              <button
                key={pill.value}
                onClick={() => setSelectedStatus(pill.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedStatus === pill.value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-card text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground'
                }`}
              >
                {pill.label} ({pill.count})
              </button>
            ))}
          </div>

          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            isLoading={isInvoicesLoading}
            searchKey="invoice_number"
            searchPlaceholder="Tìm kiếm theo số hóa đơn..."
          />
        </TabsContent>

        <TabsContent value="transactions">
          <DataTable
            columns={transactionColumns}
            data={transactions}
            isLoading={isTxsLoading}
            searchKey="reference_code"
            searchPlaceholder="Tìm theo mã giao dịch ngân hàng / Ref code..."
          />
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <CreatePaymentDialog
        invoice={paymentInvoice}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />

      {/* Invoice Detail & Timeline Drawer */}
      <InvoiceDetailDrawer
        invoice={detailInvoice}
        transactions={transactions}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
      />
    </div>
  );
}
