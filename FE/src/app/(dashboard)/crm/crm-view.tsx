'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLeads, useUpdateLeadStatus, Lead, LeadStatus, isValidLeadTransition, VALID_LEAD_TRANSITIONS } from '@/entities/lead';
import { useCustomers, Customer } from '@/entities/customer';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { CreateLeadModal } from '@/features/crm/create-lead-modal';
import { CreateCustomerModal } from '@/features/crm/create-customer-modal';
import { UpdateLeadStatusDialog } from '@/features/crm/update-lead-status-dialog';
import { formatDate } from '@/shared/lib/utils';
import {
  Users,
  Phone,
  Car,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Clock,
  Search,
} from 'lucide-react';

interface KanbanColumn {
  id: LeadStatus;
  title: string;
  colorClass: string;
  badgeClass: string;
  indicatorColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'NEW',
    title: 'Mới Tiếp Nhận',
    colorClass: 'border-[#e8e8e8] bg-[#f5f5f5]/80',
    badgeClass: 'bg-[#efefef] text-[#202020] border border-[#e8e8e8]',
    indicatorColor: 'bg-[#828282]',
  },
  {
    id: 'CONTACTED',
    title: 'Đã Liên Hệ',
    colorClass: 'border-[#e8e8e8] bg-[#f5f5f5]/80',
    badgeClass: 'bg-[#ff682c]/10 text-[#ff682c] border border-[#ff682c]/20',
    indicatorColor: 'bg-[#ff682c]',
  },
  {
    id: 'TEST_DRIVE',
    title: 'Đăng Ký Lái Thử',
    colorClass: 'border-[#ded7cb] bg-[#ebe6dd]/30',
    badgeClass: 'bg-[#816729]/10 text-[#816729] border border-[#816729]/20',
    indicatorColor: 'bg-[#816729]',
  },
  {
    id: 'QUOTED',
    title: 'Đã Gửi Báo Giá',
    colorClass: 'border-[#ded7cb] bg-[#ebe6dd]/50',
    badgeClass: 'bg-[#816729]/15 text-[#816729] border border-[#816729]/30',
    indicatorColor: 'bg-[#816729]',
  },
  {
    id: 'WON',
    title: 'Chốt Cọc (WON)',
    colorClass: 'border-emerald-200 bg-emerald-50/40',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    indicatorColor: 'bg-emerald-600',
  },
  {
    id: 'LOST',
    title: 'Thất Bại / Hủy',
    colorClass: 'border-rose-200 bg-rose-50/30',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    indicatorColor: 'bg-rose-600',
  },
];

export function CRMView() {
  const router = useRouter();
  const { data: leads = [], isLoading: isLeadsLoading } = useLeads();
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const updateStatusMutation = useUpdateLeadStatus();

  // 1. Chế độ xem & Bộ lọc tìm kiếm
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 400);

  // 2. Trạng thái kéo thả & Dialog
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [dialogLead, setDialogLead] = useState<Lead | null>(null);
  const [dialogTargetStatus, setDialogTargetStatus] = useState<LeadStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 3. Tính toán KPI Phễu Bán Hàng
  const totalLeads = leads.length;
  const inProgressLeads = leads.filter((l) => ['NEW', 'CONTACTED', 'TEST_DRIVE', 'QUOTED'].includes(l.status)).length;
  const wonLeads = leads.filter((l) => l.status === 'WON').length;
  const lostLeads = leads.filter((l) => l.status === 'LOST').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

  // 4. Xử lý Kéo Thả (Drag & Drop) & Kiểm tra State Machine
  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
    setTransitionError(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDrop = async (targetStatus: LeadStatus) => {
    setDragOverColumn(null);
    if (!draggedLead || draggedLead.status === targetStatus) {
      setDraggedLead(null);
      return;
    }

    if (!isValidLeadTransition(draggedLead.status, targetStatus)) {
      const allowed = VALID_LEAD_TRANSITIONS[draggedLead.status] || [];
      setTransitionError(
        `Quy trình vi phạm: Không thể nhảy cóc từ "${draggedLead.status}" sang "${targetStatus}". Các bước hợp lệ: [${allowed.join(', ') || 'Không còn bước tiếp theo'}]`
      );
      setDraggedLead(null);
      setTimeout(() => setTransitionError(null), 5000);
      return;
    }

    if (targetStatus === 'LOST') {
      setDialogLead(draggedLead);
      setDialogTargetStatus('LOST');
      setDialogOpen(true);
      setDraggedLead(null);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: draggedLead.id,
        data: { status: targetStatus },
      });
    } catch {
      setTransitionError('Lỗi cập nhật trạng thái cơ hội');
    } finally {
      setDraggedLead(null);
    }
  };

  // 5. Chuyển bước nhanh qua Click
  const handleQuickAdvance = (lead: Lead) => {
    const nextSteps = VALID_LEAD_TRANSITIONS[lead.status] || [];
    const nextSuccessStep = nextSteps.find((s) => s !== 'LOST');
    if (nextSuccessStep) {
      updateStatusMutation.mutate({
        id: lead.id,
        data: { status: nextSuccessStep },
      });
    }
  };

  // 6. Lọc khách hàng bằng debounced search
  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch.trim()) return customers;
    const q = debouncedCustomerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.id_card_number && c.id_card_number.includes(q))
    );
  }, [customers, debouncedCustomerSearch]);

  // Cột bảng Leads Table View
  const leadColumns: ColumnDef<Lead>[] = [
    {
      header: 'Khách Hàng',
      accessorKey: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-bold text-[#202020]">{row.customer_name || 'Khách hàng mới'}</div>
          <div className="flex items-center gap-1 text-[11px] text-[#828282] font-mono mt-0.5">
            <Phone className="h-3 w-3" />
            {row.customer_phone || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Dòng Xe Quan Tâm',
      accessorKey: 'model_name',
      cell: (row) => (
        <span className="text-xs font-bold text-[#202020]">
          {row.model_name || 'Chưa chọn'}
        </span>
      ),
    },
    {
      header: 'Trạng Thái Phễu',
      accessorKey: 'status',
      cell: (row) => {
        const variant =
          row.status === 'WON'
            ? 'success'
            : row.status === 'NEW'
            ? 'default'
            : row.status === 'LOST'
            ? 'destructive'
            : 'ember';
        return <Badge variant={variant} dot>{row.status}</Badge>;
      },
    },
    {
      header: 'Thời Gian Tiếp Nhận',
      accessorKey: 'created_at',
      cell: (row) => (
        <span suppressHydrationWarning className="text-xs text-[#828282] font-mono">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      header: 'Thao Tác',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'WON' ? (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs bg-[#202020] hover:bg-[#333333] text-white rounded-full shadow-xs"
              onClick={() => router.push('/sales')}
            >
              <ShoppingBag className="mr-1 h-3.5 w-3.5 text-[#ff682c]" />
              Lên Đơn Bán Xe
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full border-[#e8e8e8] hover:bg-[#efefef] text-[#202020]"
              onClick={() => handleQuickAdvance(row)}
              disabled={row.status === 'LOST'}
            >
              Tiến 1 bước
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Cột bảng Khách Hàng Table View
  const customerColumns: ColumnDef<Customer>[] = [
    {
      header: 'Tên Khách Hàng',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <div className="font-bold text-[#202020]">{row.name}</div>
          <Badge variant={row.type === 'ENTERPRISE' ? 'graphite' : 'secondary'} className="text-[9px] mt-0.5">
            {row.type === 'ENTERPRISE' ? 'Doanh Nghiệp' : 'Cá Nhân'}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Số Điện Thoại',
      accessorKey: 'phone',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#202020]">
          {row.phone}
        </span>
      ),
    },
    {
      header: 'Email / CCCD',
      cell: (row) => (
        <div className="text-xs text-[#828282]">
          <div>{row.email || '-'}</div>
          <div className="font-mono text-[10px] text-[#828282]/80">{row.id_card_number || ''}</div>
        </div>
      ),
    },
    {
      header: 'Địa Chỉ',
      accessorKey: 'address',
      cell: (row) => <span className="text-xs text-[#828282] truncate max-w-[200px]">{row.address || '-'}</span>,
    },
    {
      header: 'Ngày Tạo',
      accessorKey: 'created_at',
      cell: (row) => (
        <span suppressHydrationWarning className="text-xs text-[#828282] font-mono">
          {formatDate(row.created_at)}
        </span>
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
              <Users className="h-4.5 w-4.5" />
            </div>
            Quản Lý Khách Hàng & Phễu Cơ Hội (CRM)
          </h2>
          <p className="text-xs text-[#828282] mt-1">
            Theo dõi tiến trình chăm sóc khách hàng theo State Machine, hạn chế trùng lặp SĐT và chốt hợp đồng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <CreateCustomerModal />
          <CreateLeadModal />
        </div>
      </div>

      {/* Cảnh báo vi phạm State Machine */}
      {transitionError && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 animate-fade-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{transitionError}</span>
        </div>
      )}

      {/* KPI Phễu Bán Hàng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#202020]" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Tổng Cơ Hội Tiếp Nhận
          </p>
          <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
            {totalLeads} khách
          </h4>
          <p className="mt-2 text-[11px] text-[#828282] font-semibold">Toàn bộ phễu bán hàng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff682c]" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Đang Chăm Sóc Tích Cực
          </p>
          <h4 className="text-xl font-bold text-[#ff682c] font-mono mt-1">
            {inProgressLeads} cơ hội
          </h4>
          <p className="mt-2 text-[11px] text-[#828282]">Từ NEW đến QUOTED</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#816729]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Tỷ Lệ Chốt Hợp Đồng
              </p>
              <h4 className="text-xl font-bold text-[#202020] font-mono mt-1">
                {conversionRate}%
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#816729]/10 text-[#816729] border border-[#816729]/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-semibold font-mono">{wonLeads} hợp đồng thành công</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Cơ Hội Thất Bại (LOST)
          </p>
          <h4 className="text-xl font-bold text-rose-600 font-mono mt-1">
            {lostLeads} khách
          </h4>
          <p className="mt-2 text-[11px] text-[#828282]">Giá cao, mua hãng khác...</p>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="leads" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="leads">
              Phễu Cơ Hội Bán Hàng ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="customers">
              Danh Bạ Khách Hàng ({customers.length})
            </TabsTrigger>
          </TabsList>

          {/* Toggle Kanban / Table */}
          <div className="flex items-center gap-1 rounded-full bg-[#efefef] p-1 border border-[#e8e8e8] self-start">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#202020] shadow-xs'
                  : 'text-[#828282] hover:text-[#202020]'
              }`}
            >
              <Kanban className="h-3.5 w-3.5 text-[#ff682c]" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#202020] shadow-xs'
                  : 'text-[#828282] hover:text-[#202020]'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Bảng Danh Sách
            </button>
          </div>
        </div>

        {/* Tab 1: Phễu Bán Hàng */}
        <TabsContent value="leads">
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((col) => {
                const columnLeads = leads.filter((l) => l.status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDrop={() => handleDrop(col.id)}
                    className={`flex flex-col rounded-2xl border p-3 transition-all min-h-[480px] ${
                      col.colorClass
                    } ${isOver ? 'ring-2 ring-[#ff682c] scale-[1.01]' : 'border-[#e8e8e8]'}`}
                  >
                    {/* Header Cột */}
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#e8e8e8]">
                      <span className="text-xs font-bold text-[#202020] flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${col.indicatorColor}`} />
                        {col.title}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${col.badgeClass}`}>
                        {columnLeads.length}
                      </span>
                    </div>

                    {/* Danh sách thẻ Lead */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[600px] pr-0.5">
                      {isLeadsLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="h-28 rounded-2xl bg-white skeleton-shimmer" />
                        ))
                      ) : columnLeads.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8e8e8] text-[11px] text-[#828282]">
                          Thả cơ hội vào đây
                        </div>
                      ) : (
                        columnLeads.map((lead) => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={() => handleDragStart(lead)}
                            className="group cursor-grab active:cursor-grabbing rounded-2xl border border-[#e8e8e8] bg-white p-3.5 shadow-xs hover:shadow-md hover:border-[#828282]/40 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <h5 className="text-xs font-bold text-[#202020] group-hover:text-[#ff682c] transition-colors">
                                {lead.customer_name || 'Khách hàng mới'}
                              </h5>
                              <span suppressHydrationWarning className="text-[10px] text-[#828282] flex items-center gap-0.5 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(lead.created_at)}
                              </span>
                            </div>

                            {/* Số điện thoại */}
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-[#4d4d4d]">
                              <Phone className="h-3 w-3 text-[#828282]" />
                              <a href={`tel:${lead.customer_phone}`} className="hover:underline hover:text-[#202020]">
                                {lead.customer_phone}
                              </a>
                            </div>

                            {/* Model xe quan tâm */}
                            {lead.model_name && (
                              <div className="mt-2 flex items-center gap-1 rounded-full bg-[#efefef] px-2.5 py-0.5 text-[10px] font-semibold text-[#202020] border border-[#e8e8e8]">
                                <Car className="h-3 w-3 shrink-0 text-[#ff682c]" />
                                <span className="truncate">{lead.model_name}</span>
                              </div>
                            )}

                            {lead.notes && (
                              <p className="mt-2 text-[10px] text-[#828282] line-clamp-2 italic">
                                &ldquo;{lead.notes}&rdquo;
                              </p>
                            )}

                            {/* Nút hành động */}
                            <div className="mt-3 pt-2 border-t border-[#e8e8e8] flex items-center justify-between">
                              {lead.status === 'WON' ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-full h-6 text-[10px] py-0 bg-[#202020] hover:bg-[#333333] text-white rounded-full shadow-xs"
                                  onClick={() => router.push('/sales')}
                                >
                                  <ShoppingBag className="mr-1 h-3 w-3 text-[#ff682c]" />
                                  Lên Đơn Bán Xe
                                </Button>
                              ) : (
                                <button
                                  onClick={() => handleQuickAdvance(lead)}
                                  disabled={lead.status === 'LOST'}
                                  className="text-[10px] font-semibold text-[#202020] hover:text-[#ff682c] flex items-center gap-0.5 ml-auto transition-colors"
                                >
                                  Tiến bước
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <DataTable
              columns={leadColumns}
              data={leads}
              isLoading={isLeadsLoading}
              searchKey="customer_name"
              searchPlaceholder="Tìm kiếm cơ hội theo tên khách hàng..."
            />
          )}
        </TabsContent>

        {/* Tab 2: Danh Bạ Khách Hàng */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center gap-3 w-full sm:w-80">
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Tra cứu theo SĐT, Tên, CCCD..."
              icon={<Search className="h-4 w-4 text-[#828282]" />}
              className="h-9.5 text-xs bg-[#f5f5f5] border-[#e8e8e8] rounded-full focus:border-[#ff682c] px-4"
            />
          </div>

          <DataTable
            columns={customerColumns}
            data={filteredCustomers}
            isLoading={isCustomersLoading}
            searchKey="name"
            searchPlaceholder="Lọc theo tên..."
          />
        </TabsContent>
      </Tabs>

      {/* Dialog xác nhận trạng thái & lý do LOST */}
      <UpdateLeadStatusDialog
        lead={dialogLead}
        targetStatus={dialogTargetStatus}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
