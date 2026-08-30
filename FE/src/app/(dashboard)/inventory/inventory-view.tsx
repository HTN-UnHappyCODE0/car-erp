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
          <span className="font-mono text-xs font-bold text-indigo-500">
            {formatVIN(row.vin)}
          </span>
          <button
            onClick={() => handleCopyVin(row.vin)}
            className="text-muted-foreground hover:text-indigo-500 transition-colors p-1 rounded-md hover:bg-muted"
            title="Sao chép số VIN"
          >
            {copiedVin === row.vin ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
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
        <span className="font-mono text-xs text-muted-foreground font-medium">
          {row.engine_number || '-'}
        </span>
      ),
    },
    {
      header: 'Màu Ngoại / Nội Thất',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">
            {row.color_exterior || 'Chưa định màu'}
          </div>
          <div className="text-[11px] text-muted-foreground">
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
            ? 'warning'
            : row.status === 'SOLD'
            ? 'default'
            : row.status === 'MAINTENANCE'
            ? 'secondary'
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
        <span className="text-xs font-bold text-foreground font-mono">
          {formatVND(row.purchase_price)}
        </span>
      ),
    },
    {
      header: 'Ngày Nhập Kho',
      accessorKey: 'created_at',
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>
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
              className="h-7 text-xs rounded-lg border-border/60 hover:bg-muted"
              onClick={() => handleOpenTransfer(row)}
              disabled={row.status === 'RESERVED' || row.status === 'SOLD'}
              title={
                row.status === 'RESERVED' || row.status === 'SOLD'
                  ? 'Không thể điều chuyển xe đã giữ cọc hoặc đã bán'
                  : 'Điều chuyển xe sang showroom khác'
              }
            >
              <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
              Chuyển chi nhánh
            </Button>
          )}

          {/* Nút Đổi Trạng Thái */}
          {canUpdateStatus && row.status !== 'SOLD' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-lg hover:bg-muted">
                  Đổi trạng thái
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.status !== 'IN_STOCK' && row.status !== 'RESERVED' && (
                  <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, 'IN_STOCK')}>
                    Sẵn sàng bán (IN_STOCK)
                  </DropdownMenuItem>
                )}
                {row.status !== 'MAINTENANCE' && row.status !== 'RESERVED' && (
                  <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, 'MAINTENANCE')}>
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
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500">
              <Car className="h-4.5 w-4.5" />
            </div>
            Quản Lý Kho Xe & Danh Mục Mẫu Xe
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
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
        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Số Xe Trong Kho
              </p>
              <h4 className="text-xl font-black text-foreground font-mono mt-1">
                {totalVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold font-mono">
            <span>{inStockVehicles} xe sẵn sàng chào bán</span>
          </div>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Giá Trị Tồn Kho Ước Tính
              </p>
              <h4 className="text-xl font-black text-foreground font-mono mt-1">
                {formatVND(totalInventoryValue)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">Tính trên xe IN_STOCK & RESERVED</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-600 via-amber-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Xe Đang Khóa Giữ Cọc
              </p>
              <h4 className="text-xl font-black text-amber-500 font-mono mt-1">
                {reservedVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">Khóa trong đơn hàng bán xe</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Xe Đang Ở Xưởng Bảo Dưỡng
              </p>
              <h4 className="text-xl font-black text-foreground font-mono mt-1">
                {maintenanceVehicles} xe
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-muted-foreground">Kiểm tra kỹ thuật định kỳ</p>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="vehicles" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Kho Xe Thực Tế ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="models" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
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
                  <div key={i} className="h-32 rounded-2xl bg-muted/60 skeleton-shimmer" />
                ))
              : models.map((m) => (
                  <div
                    key={m.id}
                    className="group rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-indigo-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          {m.make}
                        </span>
                        <h4 className="text-lg font-black text-foreground mt-0.5">
                          {m.model}
                        </h4>
                      </div>
                      <Badge variant="outline" className="font-mono font-bold border-border/60">
                        {m.year}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <div>
                        Phiên bản: <span className="font-semibold text-foreground">{m.trim || 'Tiêu chuẩn'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
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
