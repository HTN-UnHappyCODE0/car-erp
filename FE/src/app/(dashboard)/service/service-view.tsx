'use client';

import React, { useState, useMemo } from 'react';
import {
  useRepairOrders,
  useUpdateRepairOrderStatus,
  useCreateRepairOrderInvoice,
  RepairOrder,
  RepairOrderStatus,
} from '@/entities/repair-order';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { CreateRepairModal } from '@/features/service/create-repair-modal';
import { AddItemDialog } from '@/features/service/add-item-dialog';
import { RepairOrderDetailDialog } from '@/features/service/repair-order-detail-dialog';
import { VehicleHistoryDrawer } from '@/features/service/vehicle-history-drawer';
import { formatVND, formatDate, formatVIN } from '@/shared/lib/utils';
import {
  Wrench,
  Plus,
  CheckCircle,
  Receipt,
  ChevronRight,
  Gauge,
  History,
  Car,
  DollarSign,
  Clock,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function ServiceView() {
  const { data: repairOrders = [], isLoading } = useRepairOrders();
  const updateStatusMutation = useUpdateRepairOrderStatus();
  const createInvoiceMutation = useCreateRepairOrderInvoice();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Dialog states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  const [detailOrder, setDetailOrder] = useState<RepairOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);
  const [historyVehicleVin, setHistoryVehicleVin] = useState<string | undefined>(undefined);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const handleOpenAddItem = (orderId: string) => {
    setSelectedOrderId(orderId);
    setAddItemDialogOpen(true);
  };

  const handleOpenDetail = (order: RepairOrder) => {
    setDetailOrder(order);
    setDetailDialogOpen(true);
  };

  const handleOpenHistory = (vehicleId: string, vin?: string) => {
    setHistoryVehicleId(vehicleId);
    setHistoryVehicleVin(vin);
    setHistoryDrawerOpen(true);
  };

  const handleUpdateStatus = (id: string, status: RepairOrderStatus) => {
    updateStatusMutation.mutate({ id, data: { status } });
  };

  const handleCreateInvoice = (id: string) => {
    createInvoiceMutation.mutate(id);
  };

  // 1. Tính toán các chỉ số KPI Xưởng Dịch Vụ
  const totalOrders = repairOrders.length;
  const openOrders = repairOrders.filter((o) => o.status === 'OPEN').length;
  const inProgressOrders = repairOrders.filter((o) => o.status === 'IN_PROGRESS').length;
  const completedOrders = repairOrders.filter((o) => o.status === 'COMPLETED').length;
  const invoicedOrders = repairOrders.filter((o) => o.status === 'INVOICED').length;

  const totalServiceRevenue = repairOrders
    .filter((o) => o.status === 'COMPLETED' || o.status === 'INVOICED')
    .reduce((acc, o) => acc + (parseFloat(o.total_cost) || 0), 0);

  // 2. Lọc dữ liệu theo Status Filter Pill
  const filteredOrders = useMemo(() => {
    if (selectedStatus === 'ALL') return repairOrders;
    return repairOrders.filter((o) => o.status === selectedStatus);
  }, [repairOrders, selectedStatus]);

  const columns: ColumnDef<RepairOrder>[] = [
    {
      header: 'Mã Lệnh & Xe',
      accessorKey: 'id',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-indigo-500">
            #{row.id.slice(0, 8)}
          </div>
          <div className="flex items-center gap-1 font-mono text-xs text-foreground mt-0.5">
            <Car className="h-3 w-3 text-indigo-500/70" />
            {row.vehicle_vin ? formatVIN(row.vehicle_vin) : 'Xe dịch vụ'}
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'status',
      cell: (row) => {
        const variant =
          row.status === 'INVOICED'
            ? 'default'
            : row.status === 'COMPLETED'
            ? 'success'
            : row.status === 'IN_PROGRESS'
            ? 'warning'
            : 'secondary';

        return (
          <Badge variant={variant} dot className="text-[10px]">
            {row.status}
          </Badge>
        );
      },
    },
    {
      header: 'Số KM (ODO)',
      accessorKey: 'odometer',
      cell: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-mono font-bold text-foreground">
            <Gauge className="h-3.5 w-3.5 text-indigo-500" />
            {row.odometer?.toLocaleString('vi-VN')} km
          </div>
          {row.odometer_override_reason && (
            <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium mt-0.5 font-mono">
              <AlertTriangle className="h-3 w-3" /> Đã ghi đè ODO
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Khách Hàng & Triệu Chứng',
      accessorKey: 'symptoms',
      cell: (row) => (
        <div className="max-w-[220px]">
          <div className="font-semibold text-xs text-foreground">
            {row.customer_name || 'Khách hàng'}
          </div>
          <div className="text-[11px] text-muted-foreground truncate" title={row.symptoms || ''}>
            {row.symptoms || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Tổng Chi Phí',
      accessorKey: 'total_cost',
      cell: (row) => (
        <span className="text-xs font-black text-emerald-500 font-mono">
          {formatVND(row.total_cost)}
        </span>
      ),
    },
    {
      header: 'Ngày Tiếp Nhận',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Quy Trình & Thao Tác',
      cell: (row) => {
        const canEditItems = row.status === 'OPEN' || row.status === 'IN_PROGRESS';

        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => handleOpenDetail(row)}
              title="Xem chi tiết phiếu sửa chữa"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {row.vehicle_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
                onClick={() => handleOpenHistory(row.vehicle_id, row.vehicle_vin)}
                title="Xem toàn bộ lịch sử bảo dưỡng của xe này"
              >
                <History className="h-4 w-4" />
              </Button>
            )}

            {canEditItems && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-border/60 hover:bg-muted"
                onClick={() => handleOpenAddItem(row.id)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Vật tư
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg border-border/60 hover:bg-muted">
                  Tiến độ <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.status === 'OPEN' && (
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(row.id, 'IN_PROGRESS')}
                    className="cursor-pointer"
                  >
                    <Wrench className="mr-2 h-3.5 w-3.5 text-blue-500" />
                    Bắt đầu sửa chữa (IN_PROGRESS)
                  </DropdownMenuItem>
                )}
                {(row.status === 'OPEN' || row.status === 'IN_PROGRESS') && (
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(row.id, 'COMPLETED')}
                    className="cursor-pointer"
                  >
                    <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    Nghiệm thu hoàn tất (COMPLETED)
                  </DropdownMenuItem>
                )}
                {row.status === 'COMPLETED' && (
                  <DropdownMenuItem
                    onClick={() => handleCreateInvoice(row.id)}
                    className="cursor-pointer font-bold text-indigo-500"
                  >
                    <Receipt className="mr-2 h-3.5 w-3.5" />
                    Xuất Hóa Đơn Dịch Vụ (/finance)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
              <Wrench className="h-4.5 w-4.5" />
            </div>
            Xưởng Dịch Vụ & Hậu Mãi (After-Sales Service)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý tiếp nhận xe, kiểm soát Odometer chống tua lùi, kê khai bóc tách vật tư linh kiện và xuất hóa đơn dịch vụ.
          </p>
        </div>
        <CreateRepairModal />
      </div>

      {/* KPI Xưởng Dịch Vụ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tổng Lệnh Dịch Vụ
          </p>
          <h4 className="text-xl font-black text-foreground font-mono mt-1">
            {totalOrders} lệnh
          </h4>
          <p className="mt-2 text-[11px] text-indigo-500 font-semibold font-mono">
            {openOrders} tiếp nhận / {inProgressOrders} đang sửa
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Doanh Thu Xưởng Dịch Vụ
              </p>
              <h4 className="text-xl font-black text-emerald-500 font-mono mt-1">
                {formatVND(totalServiceRevenue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-500 font-semibold font-mono">
            {completedOrders + invoicedOrders} xe đã hoàn tất sửa chữa
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-blue-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Xe Đang Trong Cầu Nâng
              </p>
              <h4 className="text-xl font-black text-blue-500 font-mono mt-1">
                {inProgressOrders} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Đang được đại tu/bảo dưỡng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-600 via-amber-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Đã Nghiệm Thu & Xuất HĐ
              </p>
              <h4 className="text-xl font-black text-amber-500 font-mono mt-1">
                {completedOrders} chờ thu / {invoicedOrders} đã xuất HĐ
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Sẵn sàng bàn giao cho khách</p>
        </Card>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Tất Cả', value: 'ALL', count: totalOrders },
          { label: 'Tiếp Nhận (OPEN)', value: 'OPEN', count: openOrders },
          { label: 'Đang Sửa (IN_PROGRESS)', value: 'IN_PROGRESS', count: inProgressOrders },
          { label: 'Đã Nghiệm Thu (COMPLETED)', value: 'COMPLETED', count: completedOrders },
          { label: 'Đã Xuất HĐ (INVOICED)', value: 'INVOICED', count: invoicedOrders },
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
        searchKey="symptoms"
        searchPlaceholder="Tìm theo triệu chứng, hiện trạng xe..."
      />

      {/* Add Item Dialog */}
      <AddItemDialog
        orderId={selectedOrderId}
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
      />

      {/* Order Detail Dialog */}
      <RepairOrderDetailDialog
        order={detailOrder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onOpenAddItem={handleOpenAddItem}
      />

      {/* Vehicle History Drawer */}
      <VehicleHistoryDrawer
        vehicleId={historyVehicleId}
        vehicleVin={historyVehicleVin}
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
      />
    </div>
  );
}
