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
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#202020]">
            #{row.id.slice(0, 8)}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#4d4d4d] mt-0.5">
            <Car className="h-3 w-3 text-[#ff682c]" />
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
            ? 'graphite'
            : row.status === 'COMPLETED'
            ? 'success'
            : row.status === 'IN_PROGRESS'
            ? 'ember'
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
          <div className="flex items-center gap-1.5 font-mono font-bold text-[#202020]">
            <Gauge className="h-3.5 w-3.5 text-[#ff682c]" />
            {row.odometer?.toLocaleString('vi-VN')} km
          </div>
          {row.odometer_override_reason && (
            <div className="flex items-center gap-0.5 text-[10px] text-amber-700 font-medium mt-0.5 font-mono">
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
          <div className="font-bold text-xs text-[#202020]">
            {row.customer_name || 'Khách hàng'}
          </div>
          <div className="text-[11px] text-[#828282] truncate" title={row.symptoms || ''}>
            {row.symptoms || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Tổng Chi Phí',
      accessorKey: 'total_cost',
      cell: (row) => (
        <span className="text-xs font-bold text-[#202020] font-mono">
          {formatVND(row.total_cost)}
        </span>
      ),
    },
    {
      header: 'Ngày Tiếp Nhận',
      accessorKey: 'created_at',
      cell: (row) => (
        <span suppressHydrationWarning className="text-xs text-[#828282] font-mono">
          {formatDate(row.created_at)}
        </span>
      ),
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
              className="h-7 w-7 p-0 rounded-full text-[#828282] hover:text-[#202020] hover:bg-[#efefef]"
              onClick={() => handleOpenDetail(row)}
              title="Xem chi tiết phiếu sửa chữa"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {row.vehicle_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full text-[#ff682c] hover:text-[#e0551c] hover:bg-[#ff682c]/10"
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
                className="h-7 text-xs rounded-full border-[#e8e8e8] hover:bg-[#efefef] text-[#202020]"
                onClick={() => handleOpenAddItem(row.id)}
              >
                <Plus className="mr-1 h-3.5 w-3.5 text-[#ff682c]" />
                Vật tư
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-full border-[#e8e8e8] hover:bg-[#efefef] text-[#202020]">
                  Tiến độ <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[#e8e8e8] bg-white rounded-2xl shadow-xl p-1.5">
                {row.status === 'OPEN' && (
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(row.id, 'IN_PROGRESS')}
                    className="cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]"
                  >
                    <Wrench className="mr-2 h-3.5 w-3.5 text-[#ff682c]" />
                    Bắt đầu sửa chữa (IN_PROGRESS)
                  </DropdownMenuItem>
                )}
                {(row.status === 'OPEN' || row.status === 'IN_PROGRESS') && (
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(row.id, 'COMPLETED')}
                    className="cursor-pointer rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]"
                  >
                    <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    Nghiệm thu hoàn tất (COMPLETED)
                  </DropdownMenuItem>
                )}
                {row.status === 'COMPLETED' && (
                  <DropdownMenuItem
                    onClick={() => handleCreateInvoice(row.id)}
                    className="cursor-pointer font-bold text-[#ff682c] rounded-xl text-xs py-2 px-3 hover:bg-[#ff682c]/10"
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
          <h2 className="text-2xl font-heading font-bold tracking-tight text-[#202020] flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#202020] text-white">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            Xưởng Dịch Vụ & Hậu Mãi (After-Sales Service)
          </h2>
          <p className="text-xs text-[#828282] mt-1">
            Quản lý tiếp nhận xe, kiểm soát Odometer chống tua lùi, kê khai bóc tách vật tư linh kiện và xuất hóa đơn dịch vụ.
          </p>
        </div>
        <CreateRepairModal />
      </div>

      {/* KPI Xưởng Dịch Vụ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#202020]" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Tổng Lệnh Dịch Vụ
          </p>
          <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
            {totalOrders} lệnh
          </h4>
          <p className="mt-2 text-[11px] text-[#202020] font-semibold font-mono">
            {openOrders} tiếp nhận / {inProgressOrders} đang sửa
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#816729]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Doanh Thu Xưởng Dịch Vụ
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {formatVND(totalServiceRevenue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#816729]/10 text-[#816729] border border-[#816729]/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-semibold font-mono">
            {completedOrders + invoicedOrders} xe đã hoàn tất sửa chữa
          </p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff682c]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Xe Đang Trong Cầu Nâng
              </p>
              <h4 className="text-xl font-bold text-[#ff682c] font-mono mt-1">
                {inProgressOrders} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff682c]/10 text-[#ff682c] border border-[#ff682c]/20">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#828282]">Đang được đại tu/bảo dưỡng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#816729]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Đã Nghiệm Thu & Xuất HĐ
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {completedOrders} chờ thu / {invoicedOrders} đã xuất HĐ
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#816729]/10 text-[#816729] border border-[#816729]/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#828282]">Sẵn sàng bàn giao cho khách</p>
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
