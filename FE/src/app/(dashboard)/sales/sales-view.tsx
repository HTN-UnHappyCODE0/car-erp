'use client';

import React, { useState, useMemo } from 'react';
import { useSalesOrders, useUpdateSalesOrderStatus, SalesOrder } from '@/entities/sales-order';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { CreateOrderModal } from '@/features/sales/create-order-modal';
import { CancelOrderDialog } from '@/features/sales/cancel-order-dialog';
import { OrderStepper } from '@/features/sales/order-stepper';
import { formatVND, formatDate, formatVIN } from '@/shared/lib/utils';
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  ChevronRight,
  DollarSign,
  FileCheck,
  ShieldAlert,
  Car,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function SalesView() {
  const { data: orders = [], isLoading } = useSalesOrders();
  const updateStatusMutation = useUpdateSalesOrderStatus();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleAdvanceStatus = (
    id: string,
    status: 'DEPOSIT_PAID' | 'FULL_PAID' | 'DELIVERED'
  ) => {
    updateStatusMutation.mutate({ id, data: { status } });
  };

  const handleOpenCancelDialog = (order: SalesOrder) => {
    setCancelOrder(order);
    setCancelDialogOpen(true);
  };

  // 1. Tính toán các chỉ số KPI Doanh số Bán xe
  const totalOrders = orders.length;
  const draftOrders = orders.filter((o) => o.status === 'DRAFT').length;
  const depositPaidOrders = orders.filter((o) => o.status === 'DEPOSIT_PAID').length;
  const fullPaidOrders = orders.filter((o) => o.status === 'FULL_PAID').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;

  const totalDeliveredRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0);

  const totalDepositsHeld = orders
    .filter((o) => o.status === 'DEPOSIT_PAID' || o.status === 'FULL_PAID')
    .reduce((acc, o) => acc + parseFloat(o.deposit_amount || '0'), 0);

  // 2. Lọc dữ liệu theo Status Filter Pill
  const filteredOrders = useMemo(() => {
    if (selectedStatus === 'ALL') return orders;
    return orders.filter((o) => o.status === selectedStatus);
  }, [orders, selectedStatus]);

  const columns: ColumnDef<SalesOrder>[] = [
    {
      header: 'Mã Hợp Đồng & Khách Hàng',
      accessorKey: 'id',
      cell: (row) => (
        <div>
          <div className="font-mono text-xs font-bold text-indigo-500">
            #{row.id.slice(0, 8)}
          </div>
          <div className="font-semibold text-foreground mt-0.5">
            {row.customer_name || 'Khách hàng'}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {row.customer_phone || ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Xe Bán (Số VIN)',
      accessorKey: 'vehicle_vin',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
            <Car className="h-3.5 w-3.5 text-indigo-500" />
            {row.vehicle_vin ? formatVIN(row.vehicle_vin) : 'Chưa định VIN'}
          </div>
          {row.vehicle_model && (
            <div className="text-[11px] text-muted-foreground font-medium">{row.vehicle_model}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Tiến Trình Đơn Hàng (Order Stepper)',
      cell: (row) => (
        <div className="space-y-1">
          <OrderStepper
            status={row.status}
            depositResolution={row.deposit_resolution}
            isCompact
          />
          <div className="text-[10px] font-mono font-semibold text-muted-foreground">
            {row.status === 'DRAFT' && 'Bước 1/4: Chờ cọc'}
            {row.status === 'DEPOSIT_PAID' && 'Bước 2/4: Đã nhận cọc'}
            {row.status === 'FULL_PAID' && 'Bước 3/4: Đủ tiền chờ giao'}
            {row.status === 'DELIVERED' && 'Bước 4/4: Hoàn tất bàn giao'}
          </div>
        </div>
      ),
    },
    {
      header: 'Giá Trị Hợp Đồng',
      accessorKey: 'total_amount',
      cell: (row) => (
        <div className="text-xs font-mono">
          <div className="font-bold text-foreground">
            {formatVND(row.total_amount)}
          </div>
          {row.discount_amount && parseFloat(row.discount_amount) > 0 && (
            <div className="text-[10px] text-emerald-500">
              Giảm giá: {formatVND(row.discount_amount)}
            </div>
          )}
          {row.deposit_amount && parseFloat(row.deposit_amount) > 0 && (
            <div className="text-[10px] text-indigo-500 font-semibold">
              Cọc: {formatVND(row.deposit_amount)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Ngày Ký Kết',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Quy Trình & Thao Tác',
      cell: (row) => {
        const isClosed = row.status === 'DELIVERED' || row.status === 'CANCELLED';

        return (
          <div className="flex items-center gap-2">
            {!isClosed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg border-border/60 hover:bg-muted">
                    Chuyển bước <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {row.status === 'DRAFT' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'DEPOSIT_PAID')}
                      className="cursor-pointer"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-amber-500" />
                      Xác nhận đã cọc (DEPOSIT_PAID)
                    </DropdownMenuItem>
                  )}
                  {row.status === 'DEPOSIT_PAID' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'FULL_PAID')}
                      className="cursor-pointer"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-blue-500" />
                      Thanh toán 100% (FULL_PAID)
                    </DropdownMenuItem>
                  )}
                  {row.status === 'FULL_PAID' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'DELIVERED')}
                      className="cursor-pointer"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                      Bàn giao xe cho khách (DELIVERED)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleOpenCancelDialog(row)}
                    className="text-indigo-500 focus:text-indigo-500 cursor-pointer"
                  >
                    <XCircle className="mr-2 h-3.5 w-3.5" />
                    Hủy đơn hàng & Xử lý cọc
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {row.status === 'DELIVERED' && (
              <Badge variant="success" className="text-[10px]">
                Đã Bàn Giao
              </Badge>
            )}
            {row.status === 'CANCELLED' && (
              <Badge variant="destructive" className="text-[10px]">
                Đã Hủy
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            Hợp Đồng & Đơn Bán Xe (Sales)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Quy trình bán xe 4 bước State Machine, tự động khóa/mở kho xe theo số VIN và xử lý cọc kế toán nghiêm ngặt.
          </p>
        </div>
        <CreateOrderModal />
      </div>

      {/* KPI Doanh Số Bán Xe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tổng Hợp Đồng Bán Xe
          </p>
          <h4 className="text-xl font-black text-foreground font-mono mt-1">
            {totalOrders} đơn
          </h4>
          <p className="mt-2 text-[11px] text-indigo-500 font-semibold font-mono">
            {draftOrders} nháp / {depositPaidOrders} cọc / {fullPaidOrders} chờ giao
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Doanh Thu Đã Bàn Giao
              </p>
              <h4 className="text-xl font-black text-emerald-500 font-mono mt-1">
                {formatVND(totalDeliveredRevenue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-500 font-semibold font-mono">{deliveredOrders} xe đã giao thành công</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-blue-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tiền Đặt Cọc Đang Giữ
              </p>
              <h4 className="text-xl font-black text-blue-500 font-mono mt-1">
                {formatVND(totalDepositsHeld)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Đảm bảo thực hiện hợp đồng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-600 via-rose-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Hợp Đồng Đã Hủy
              </p>
              <h4 className="text-xl font-black text-rose-500 font-mono mt-1">
                {cancelledOrders} đơn
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Xe đã được mở khóa về kho</p>
        </Card>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Tất Cả', value: 'ALL', count: totalOrders },
          { label: 'Nháp (DRAFT)', value: 'DRAFT', count: draftOrders },
          { label: 'Đã Cọc (DEPOSIT_PAID)', value: 'DEPOSIT_PAID', count: depositPaidOrders },
          { label: 'Thanh Toán Đủ (FULL_PAID)', value: 'FULL_PAID', count: fullPaidOrders },
          { label: 'Đã Giao Xe (DELIVERED)', value: 'DELIVERED', count: deliveredOrders },
          { label: 'Đã Hủy (CANCELLED)', value: 'CANCELLED', count: cancelledOrders },
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

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        isLoading={isLoading}
        searchKey="id"
        searchPlaceholder="Tìm theo mã đơn hàng, tên khách, số VIN..."
      />

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        order={cancelOrder}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </div>
  );
}
