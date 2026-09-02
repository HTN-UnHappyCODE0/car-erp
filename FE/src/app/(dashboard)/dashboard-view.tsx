'use client';

import React from 'react';
import Link from 'next/link';
import { KPICard } from '@/widgets/kpi-cards';
import { useVehicles } from '@/entities/vehicle';
import { useSalesOrders } from '@/entities/sales-order';
import { useInvoices } from '@/entities/invoice';
import { useLeads } from '@/entities/lead';
import { useRepairOrders } from '@/entities/repair-order';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatVND, formatDate } from '@/shared/lib/utils';
import {
  Car,
  ShoppingBag,
  Receipt,
  Users,
  Wrench,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CreateVehicleModal } from '@/features/inventory/create-vehicle-modal';
import { CreateOrderModal } from '@/features/sales/create-order-modal';
import { CreateLeadModal } from '@/features/crm/create-lead-modal';
import { CreateRepairModal } from '@/features/service/create-repair-modal';

export function DashboardView() {
  const { data: vehicles = [] } = useVehicles();
  const { data: orders = [] } = useSalesOrders();
  const { data: invoices = [] } = useInvoices();
  const { data: leads = [] } = useLeads();
  const { data: repairOrders = [] } = useRepairOrders();

  // Thống kê nhanh
  const inStockVehicles = vehicles.filter((v) => v.status === 'IN_STOCK').length;
  const reservedVehicles = vehicles.filter((v) => v.status === 'RESERVED').length;
  const soldVehicles = vehicles.filter((v) => v.status === 'SOLD').length;

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((acc, inv) => acc + parseFloat(inv.amount || '0'), 0);

  const activeLeads = leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length;
  const inProgressRepairs = repairOrders.filter(
    (r) => r.status === 'IN_PROGRESS' || r.status === 'OPEN'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Hero Action Banner (Ivory & Ash Warm Wash) ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#ded7cb] bg-[#ebe6dd] p-6 sm:p-8 shadow-[0_2px_12px_rgba(32,32,32,0.03)]">
        {/* Top hairline accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#202020] via-[#ff682c] to-transparent" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ded7cb] bg-white px-3.5 py-1 text-[11px] font-semibold text-[#202020] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#ff682c]" /> Bảng Điều Hành Trực Tuyến Live
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#202020]">
              Trung Tâm Quản Trị Showroom Ô Tô
            </h2>
            <p className="text-xs text-[#4d4d4d] leading-relaxed">
              Dữ liệu đồng bộ thời gian thực với Backend Go & PostgreSQL Multi-Tenant. Quản lý kho VIN, đơn hàng State Machine và kiểm soát dòng tiền bất biến.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <CreateVehicleModal />
            <CreateOrderModal />
            <CreateLeadModal />
            <CreateRepairModal />
          </div>
        </div>
      </div>

      {/* ─── KPI Cards Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Xe Sẵn Sàng Bán (IN_STOCK)"
          value={`${inStockVehicles} xe`}
          subtitle={`${reservedVehicles} cọc · ${soldVehicles} đã giao`}
          icon={Car}
          colorTheme="ember"
          trend={{ value: '+12% tuần này', isPositive: true }}
          delayIndex={0}
        />
        <KPICard
          title="Doanh Thu Đã Thu (PAID)"
          value={formatVND(totalRevenue)}
          subtitle={`${invoices.length} hóa đơn tài chính`}
          icon={Receipt}
          colorTheme="brass"
          trend={{ value: 'Decimal Chuẩn xác', isPositive: true }}
          delayIndex={1}
        />
        <KPICard
          title="Cơ Hội Bán Hàng (CRM)"
          value={`${activeLeads} khách`}
          subtitle={`Tổng số ${leads.length} cơ hội trong phễu`}
          icon={Users}
          colorTheme="ash"
          trend={{ value: 'Chuyển đổi cao', isPositive: true }}
          delayIndex={2}
        />
        <KPICard
          title="Xe Đang Ở Xưởng Dịch Vụ"
          value={`${inProgressRepairs} lệnh`}
          subtitle={`${repairOrders.length} lượt tiếp nhận`}
          icon={Wrench}
          colorTheme="ivory"
          delayIndex={3}
        />
      </div>

      {/* ─── Main Grid: Recent Orders & Inventory Status ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Sales Orders */}
        <Card className="lg:col-span-2 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-[#e8e8e8]">
            <div>
              <CardTitle className="text-sm sm:text-base font-heading font-bold flex items-center gap-2 text-[#202020]">
                <ShoppingBag className="h-4 w-4 text-[#ff682c]" />
                Đơn Bán Xe Gần Đây
              </CardTitle>
              <p className="text-xs text-[#828282] mt-0.5">
                Các hợp đồng ký kết mới nhất áp dụng khóa bi quan chống bán trùng VIN
              </p>
            </div>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="text-xs rounded-full text-[#4d4d4d] hover:text-[#202020] hover:bg-[#efefef]">
                Xem tất cả <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[#828282]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f5] mb-3 border border-[#e8e8e8]">
                  <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
                </div>
                <p className="text-sm font-bold text-[#202020]">Chưa có đơn hàng nào</p>
                <p className="text-xs text-[#828282] mt-0.5">Nhấn &quot;Lên Đơn Bán Xe&quot; để tạo hợp đồng đầu tiên.</p>
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-[#e8e8e8] bg-[#f5f5f5]/60 p-3.5 transition-all duration-150 hover:bg-[#efefef] hover:border-[#828282]/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#202020]">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant={
                          order.status === 'FULL_PAID' || order.status === 'DELIVERED'
                            ? 'success'
                            : order.status === 'DEPOSIT_PAID'
                            ? 'ember'
                            : order.status === 'CANCELLED'
                            ? 'destructive'
                            : 'secondary'
                        }
                        dot
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p suppressHydrationWarning className="text-[11px] text-[#828282] font-medium">
                      Ngày tạo: {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-[#202020] font-mono">
                      {formatVND(order.total_amount)}
                    </p>
                    <p className="text-[10px] text-[#828282] font-mono">
                      Cọc: {formatVND(order.deposit_amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Inventory Summary */}
        <Card className="flex flex-col border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <CardHeader className="pb-3.5 border-b border-[#e8e8e8]">
            <CardTitle className="text-sm sm:text-base font-heading font-bold flex items-center gap-2 text-[#202020]">
              <Layers className="h-4 w-4 text-[#ff682c]" />
              Tình Trạng Kho Xe
            </CardTitle>
            <p className="text-xs text-[#828282]">Phân loại xe thực tế theo trạng thái</p>
          </CardHeader>
          <CardContent className="flex-1 p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#202020] font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Sẵn sàng bán (IN_STOCK)
                </span>
                <span className="font-bold text-[#202020] font-mono">
                  {inStockVehicles} xe
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#efefef] overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${vehicles.length ? (inStockVehicles / vehicles.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#202020] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#ff682c]" />
                  Đang giữ cọc (RESERVED)
                </span>
                <span className="font-bold text-[#202020] font-mono">
                  {reservedVehicles} xe
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#efefef] overflow-hidden">
                <div
                  className="h-full bg-[#ff682c] rounded-full transition-all duration-500"
                  style={{
                    width: `${vehicles.length ? (reservedVehicles / vehicles.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#202020] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#816729]" />
                  Đã bàn giao (SOLD)
                </span>
                <span className="font-bold text-[#202020] font-mono">
                  {soldVehicles} xe
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#efefef] overflow-hidden">
                <div
                  className="h-full bg-[#816729] rounded-full transition-all duration-500"
                  style={{
                    width: `${vehicles.length ? (soldVehicles / vehicles.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#e8e8e8]">
              <Link href="/inventory">
                <Button variant="outline" className="w-full text-xs rounded-full border-[#e8e8e8] bg-[#f5f5f5] hover:bg-[#efefef] text-[#202020] font-medium">
                  Xem Danh Sách Kho Xe <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
