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
          <div className="font-mono text-xs font-bold text-[#202020]">
            #{row.id.slice(0, 8)}
          </div>
          <div className="font-bold text-[#202020] mt-0.5">
            {row.customer_name || 'Khách hàng'}
          </div>
          <div className="text-[11px] font-mono text-[#828282]">
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
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#202020]">
            <Car className="h-3.5 w-3.5 text-[#ff682c]" />
            {row.vehicle_vin ? formatVIN(row.vehicle_vin) : 'Chưa định VIN'}
          </div>
          {row.vehicle_model && (
            <div className="text-[11px] text-[#828282] font-medium">{row.vehicle_model}</div>
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
          <div className="text-[10px] font-mono font-semibold text-[#828282]">
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
          <div className="font-bold text-[#202020]">
            {formatVND(row.total_amount)}
          </div>
          {row.discount_amount && parseFloat(row.discount_amount) > 0 && (
            <div className="text-[10px] text-emerald-700 font-semibold">
              Giảm: {formatVND(row.discount_amount)}
            </div>
          )}
          {row.deposit_amount && parseFloat(row.deposit_amount) > 0 && (
            <div className="text-[10px] text-[#ff682c] font-semibold">
              Cọc: {formatVND(row.deposit_amount)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Ngày Ký Kết',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-[#828282] font-mono">{formatDate(row.created_at)}</span>,
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
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-full border-[#e8e8e8] hover:bg-[#efefef] text-[#202020]">
                    Chuyển bước <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-[#e8e8e8] bg-white rounded-2xl shadow-xl p-1.5">
                  {row.status === 'DRAFT' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'DEPOSIT_PAID')}
                      className="cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-[#ff682c]" />
                      Xác nhận đã cọc (DEPOSIT_PAID)
                    </DropdownMenuItem>
                  )}
                  {row.status === 'DEPOSIT_PAID' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'FULL_PAID')}
                      className="cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-[#816729]" />
                      Thanh toán 100% (FULL_PAID)
                    </DropdownMenuItem>
                  )}
                  {row.status === 'FULL_PAID' && (
                    <DropdownMenuItem
                      onClick={() => handleAdvanceStatus(row.id, 'DELIVERED')}
                      className="cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]"
                    >
                      <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                      Bàn giao xe cho khách (DELIVERED)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleOpenCancelDialog(row)}
                    className="text-rose-600 focus:text-rose-600 cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-rose-50"
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
          <h2 className="text-2xl font-heading font-bold tracking-tight text-[#202020] flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#202020] text-white">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            Hợp Đồng & Đơn Bán Xe (Sales)
          </h2>
          <p className="text-xs text-[#828282] mt-1">
            Quy trình bán xe 4 bước State Machine, tự động khóa/mở kho xe theo số VIN và xử lý cọc kế toán nghiêm ngặt.
          </p>
        </div>
        <CreateOrderModal />
      </div>

      {/* KPI Doanh Số Bán Xe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#202020]" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Tổng Hợp Đồng Bán Xe
          </p>
          <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
            {totalOrders} đơn
          </h4>
          <p className="mt-2 text-[11px] text-[#202020] font-semibold font-mono">
            {draftOrders} nháp / {depositPaidOrders} cọc / {fullPaidOrders} chờ giao
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#816729]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Doanh Thu Đã Bàn Giao
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {formatVND(totalDeliveredRevenue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#816729]/10 text-[#816729] border border-[#816729]/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-semibold font-mono">{deliveredOrders} xe đã giao thành công</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff682c]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Tiền Đặt Cọc Đang Giữ
              </p>
              <h4 className="text-xl font-bold text-[#ff682c] font-mono mt-1">
                {formatVND(totalDepositsHeld)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff682c]/10 text-[#ff682c] border border-[#ff682c]/20">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#828282]">Đảm bảo thực hiện hợp đồng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Hợp Đồng Đã Hủy
              </p>
              <h4 className="text-xl font-bold text-rose-600 font-mono mt-1">
                {cancelledOrders} đơn
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#828282]">Xe đã được mở khóa về kho</p>
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
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedStatus === pill.value
                ? 'bg-[#202020] text-white shadow-xs'
                : 'bg-[#efefef] text-[#4d4d4d] border border-[#e8e8e8] hover:bg-[#e8e8e8] hover:text-[#202020]'
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
