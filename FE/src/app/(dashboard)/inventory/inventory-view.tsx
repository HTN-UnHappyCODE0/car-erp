'use client';

import React, { useState, useMemo } from 'react';
import { useVehicles, useVehicleModels, useUpdateVehicleStatus, Vehicle, VehicleStatus } from '@/entities/vehicle';
import { useAuthStore } from '@/shared/store/auth-store';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { CreateVehicleModal } from '@/features/inventory/create-vehicle-modal';
import { CreateModelModal } from '@/features/inventory/create-model-modal';
import { TransferVehicleModal } from '@/features/inventory/transfer-vehicle-modal';
import { formatVND, formatDate, formatVIN } from '@/shared/lib/utils';
import {
  Car,
  ArrowRightLeft,
  Copy,
  Check,
  Building2,
  DollarSign,
  Boxes,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function InventoryView() {
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useVehicles();
  const { data: models = [], isLoading: isModelsLoading } = useVehicleModels();
  const updateStatusMutation = useUpdateVehicleStatus();

  // 1. Lấy thông tin quyền hạn người dùng (UI-Level RBAC)
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || 'superadmin';
  const canManageInventory = userRole === 'superadmin' || userRole === 'branch_manager';
  const canUpdateStatus =
    userRole === 'superadmin' || userRole === 'branch_manager' || userRole === 'mechanic';

  // 2. Trạng thái lọc và tương tác
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedVin, setCopiedVin] = useState<string | null>(null);
  const [selectedVehicleForTransfer, setSelectedVehicleForTransfer] = useState<Vehicle | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Copy VIN 1-click
  const handleCopyVin = (vin: string) => {
    navigator.clipboard.writeText(vin);
    setCopiedVin(vin);
    setTimeout(() => setCopiedVin(null), 2000);
  };

  const handleOpenTransfer = (vehicle: Vehicle) => {
    setSelectedVehicleForTransfer(vehicle);
    setTransferModalOpen(true);
  };

  const handleUpdateStatus = (id: string, status: VehicleStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  // 3. Tính toán các chỉ số KPI Tồn kho
  const totalVehicles = vehicles.length;
  const inStockVehicles = vehicles.filter((v) => v.status === 'IN_STOCK').length;
  const reservedVehicles = vehicles.filter((v) => v.status === 'RESERVED').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const soldVehicles = vehicles.filter((v) => v.status === 'SOLD').length;

  const totalInventoryValue = vehicles
    .filter((v) => v.status === 'IN_STOCK' || v.status === 'RESERVED')
    .reduce((acc, v) => acc + parseFloat(v.purchase_price || '0'), 0);

  // 4. Lọc dữ liệu xe theo Status Filter Pill
  const filteredVehicles = useMemo(() => {
    if (selectedStatus === 'ALL') return vehicles;
    return vehicles.filter((v) => v.status === selectedStatus);
  }, [vehicles, selectedStatus]);

  // 5. Cấu hình bảng dữ liệu DataTable
  const vehicleColumns: ColumnDef<Vehicle>[] = [
    {
      header: 'Số Khung (VIN)',
      accessorKey: 'vin',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#202020]">
            {formatVIN(row.vin)}
          </span>
          <button
            onClick={() => handleCopyVin(row.vin)}
            className="text-[#828282] hover:text-[#ff682c] transition-colors p-1 rounded-md hover:bg-[#efefef]"
            title="Sao chép số VIN"
          >
            {copiedVin === row.vin ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      header: 'Số Máy (Engine No.)',
      accessorKey: 'engine_number',
      cell: (row) => (
        <span className="font-mono text-xs text-[#828282] font-medium">
          {row.engine_number || '-'}
        </span>
      ),
    },
    {
      header: 'Màu Ngoại / Nội Thất',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-bold text-[#202020]">
            {row.color_exterior || 'Chưa định màu'}
          </div>
          <div className="text-[11px] text-[#828282]">
            Nội thất: {row.color_interior || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'status',
      cell: (row) => {
        const variant =
          row.status === 'IN_STOCK'
            ? 'success'
            : row.status === 'RESERVED'
            ? 'ember'
            : row.status === 'SOLD'
            ? 'graphite'
            : row.status === 'MAINTENANCE'
            ? 'brass'
            : 'destructive';

        return (
          <Badge variant={variant} dot>
            {row.status}
          </Badge>
        );
      },
    },
    {
      header: 'Giá Nhập (VND)',
      accessorKey: 'purchase_price',
      cell: (row) => (
        <span className="text-xs font-bold text-[#202020] font-mono">
          {formatVND(row.purchase_price)}
        </span>
      ),
    },
    {
      header: 'Ngày Nhập Kho',
      accessorKey: 'created_at',
      cell: (row) => (
        <span suppressHydrationWarning className="text-xs text-[#828282] font-mono">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      header: 'Thao Tác Nghiệp Vụ',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* Nút Điều Chuyển Showroom */}
          {canManageInventory && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full border-[#e8e8e8] hover:bg-[#efefef] text-[#202020]"
              onClick={() => handleOpenTransfer(row)}
              disabled={row.status === 'RESERVED' || row.status === 'SOLD'}
              title={
                row.status === 'RESERVED' || row.status === 'SOLD'
                  ? 'Không thể điều chuyển xe đã giữ cọc hoặc đã bán'
                  : 'Điều chuyển xe sang showroom khác'
              }
            >
              <ArrowRightLeft className="mr-1 h-3.5 w-3.5 text-[#ff682c]" />
              Chuyển chi nhánh
            </Button>
          )}

          {/* Nút Đổi Trạng Thái */}
          {canUpdateStatus && row.status !== 'SOLD' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs rounded-full hover:bg-[#efefef] text-[#4d4d4d]">
                  Đổi trạng thái
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[#e8e8e8] bg-white rounded-2xl shadow-xl p-1.5">
                {row.status !== 'IN_STOCK' && row.status !== 'RESERVED' && (
                  <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, 'IN_STOCK')} className="rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]">
                    Sẵn sàng bán (IN_STOCK)
                  </DropdownMenuItem>
                )}
                {row.status !== 'MAINTENANCE' && row.status !== 'RESERVED' && (
                  <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, 'MAINTENANCE')} className="rounded-xl text-xs py-2 px-3 hover:bg-[#efefef]">
                    Đang bảo dưỡng (MAINTENANCE)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight text-[#202020] flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#202020] text-white">
              <Car className="h-4.5 w-4.5" />
            </div>
            Quản Lý Kho Xe & Danh Mục Mẫu Xe
          </h2>
          <p className="text-xs text-[#828282] mt-1">
            Quản lý số khung VIN theo chuẩn quốc tế ISO 3779, giá trị tài sản tồn kho và điều chuyển đa showroom.
          </p>
        </div>

        {/* UI-Level RBAC */}
        {canManageInventory && (
          <div className="flex items-center gap-2.5">
            <CreateModelModal />
            <CreateVehicleModal />
          </div>
        )}
      </div>

      {/* KPI Tồn Kho Tổng Hợp */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#202020]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Tổng Số Xe Trong Kho
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {totalVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efefef] text-[#202020] border border-[#e8e8e8]">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold font-mono">
            <span>{inStockVehicles} xe sẵn sàng chào bán</span>
          </div>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#816729]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Giá Trị Tồn Kho Ước Tính
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {formatVND(totalInventoryValue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#816729]/10 text-[#816729] border border-[#816729]/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[#828282]">Tính trên xe IN_STOCK & RESERVED</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff682c]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Xe Đang Khóa Giữ Cọc
              </p>
              <h4 className="text-xl font-bold text-[#ff682c] font-mono mt-1">
                {reservedVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff682c]/10 text-[#ff682c] border border-[#ff682c]/20">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[#828282]">Khóa trong đơn hàng bán xe</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#202020]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Xe Đang Ở Xưởng Bảo Dưỡng
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {maintenanceVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efefef] text-[#202020] border border-[#e8e8e8]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[#828282]">Kiểm tra kỹ thuật định kỳ</p>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="vehicles">
            Kho Xe Thực Tế ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="models">
            Danh Mục Dòng Xe ({models.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kho Xe Thực Tế */}
        <TabsContent value="vehicles" className="space-y-4">
          {/* Quick Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Tất Cả', value: 'ALL', count: totalVehicles },
              { label: 'Sẵn Sàng Bán (IN_STOCK)', value: 'IN_STOCK', count: inStockVehicles },
              { label: 'Đã Đặt Cọc (RESERVED)', value: 'RESERVED', count: reservedVehicles },
              { label: 'Bảo Dưỡng (MAINTENANCE)', value: 'MAINTENANCE', count: maintenanceVehicles },
              { label: 'Đã Giao (SOLD)', value: 'SOLD', count: soldVehicles },
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

          <DataTable
            columns={vehicleColumns}
            data={filteredVehicles}
            isLoading={isVehiclesLoading}
            searchKey="vin"
            searchPlaceholder="Tra cứu theo số khung VIN..."
          />
        </TabsContent>

        {/* Tab 2: Danh Mục Dòng Xe */}
        <TabsContent value="models">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isModelsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-[#efefef] skeleton-shimmer" />
                ))
              : models.map((m) => (
                  <div
                    key={m.id}
                    className="group rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-[0_1px_3px_rgba(32,32,32,0.02)] transition-all duration-200 hover:shadow-md hover:border-[#828282]/40"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff682c]">
                          {m.make}
                        </span>
                        <h4 className="text-lg font-heading font-bold text-[#202020] mt-0.5">
                          {m.model}
                        </h4>
                      </div>
                      <Badge variant="outline" className="font-mono font-bold border-[#e8e8e8] text-[#202020]">
                        {m.year}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#e8e8e8] pt-3 text-xs text-[#828282]">
                      <div>
                        Phiên bản: <span className="font-semibold text-[#202020]">{m.trim || 'Tiêu chuẩn'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-[#828282]">
                        <Building2 className="h-3.5 w-3.5 text-[#ff682c]" />
                        Đang kinh doanh
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Transfer Modal */}
      <TransferVehicleModal
        vehicle={selectedVehicleForTransfer}
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
      />
    </div>
  );
}
