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
    colorClass: 'border-blue-500/30 bg-blue-500/5',
    badgeClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    indicatorColor: 'bg-blue-500',
  },
  {
    id: 'CONTACTED',
    title: 'Đã Liên Hệ',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    indicatorColor: 'bg-indigo-500',
  },
  {
    id: 'TEST_DRIVE',
    title: 'Đăng Ký Lái Thử',
    colorClass: 'border-purple-500/30 bg-purple-500/5',
    badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    indicatorColor: 'bg-purple-500',
  },
  {
    id: 'QUOTED',
    title: 'Đã Gửi Báo Giá',
    colorClass: 'border-amber-500/30 bg-amber-500/5',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    indicatorColor: 'bg-amber-500',
  },
  {
    id: 'WON',
    title: 'Chốt Cọc (WON)',
    colorClass: 'border-emerald-500/40 bg-emerald-500/10',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    indicatorColor: 'bg-emerald-500',
  },
  {
    id: 'LOST',
    title: 'Thất Bại / Hủy',
    colorClass: 'border-rose-500/30 bg-rose-500/5',
    badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    indicatorColor: 'bg-rose-500',
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
          <div className="font-semibold text-foreground">{row.customer_name || 'Khách hàng mới'}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
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
        <span className="text-xs font-semibold text-indigo-500">
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
            : 'secondary';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      header: 'Thời Gian Tiếp Nhận',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Thao Tác',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'WON' ? (
            <Button
              variant="brand"
              size="sm"
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
              onClick={() => router.push('/sales')}
            >
              <ShoppingBag className="mr-1 h-3.5 w-3.5" />
              Lên Đơn Bán Xe
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-lg border-border/60 hover:bg-muted"
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
          <div className="font-semibold text-foreground">{row.name}</div>
          <Badge variant={row.type === 'ENTERPRISE' ? 'default' : 'secondary'} className="text-[9px] mt-0.5">
            {row.type === 'ENTERPRISE' ? 'Doanh Nghiệp' : 'Cá Nhân'}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Số Điện Thoại',
      accessorKey: 'phone',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.phone}
        </span>
      ),
    },
    {
      header: 'Email / CCCD',
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          <div>{row.email || '-'}</div>
          <div className="font-mono text-[10px] text-muted-foreground/70">{row.id_card_number || ''}</div>
        </div>
      ),
    },
    {
      header: 'Địa Chỉ',
      accessorKey: 'address',
      cell: (row) => <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.address || '-'}</span>,
    },
    {
      header: 'Ngày Tạo',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500">
              <Users className="h-4.5 w-4.5" />
            </div>
            Quản Lý Khách Hàng & Phễu Cơ Hội (CRM)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
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
        <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-500 animate-fade-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{transitionError}</span>
        </div>
      )}

      {/* KPI Phễu Bán Hàng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-blue-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tổng Cơ Hội Tiếp Nhận
          </p>
          <h4 className="text-xl font-black text-foreground font-mono mt-1">
            {totalLeads} khách
          </h4>
          <p className="mt-2 text-[11px] text-blue-500 font-semibold">Toàn bộ phễu bán hàng</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Đang Chăm Sóc Tích Cực
          </p>
          <h4 className="text-xl font-black text-indigo-400 font-mono mt-1">
            {inProgressLeads} cơ hội
          </h4>
          <p className="mt-2 text-[11px] text-muted-foreground">Từ NEW đến QUOTED</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 via-emerald-500 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tỷ Lệ Chốt Hợp Đồng
              </p>
              <h4 className="text-xl font-black text-emerald-500 font-mono mt-1">
                {conversionRate}%
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-500 font-semibold font-mono">{wonLeads} hợp đồng thành công</p>
        </Card>

        <Card className="kpi-card relative p-4.5 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-600 via-rose-500 to-transparent" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Cơ Hội Thất Bại (LOST)
          </p>
          <h4 className="text-xl font-black text-rose-500 font-mono mt-1">
            {lostLeads} khách
          </h4>
          <p className="mt-2 text-[11px] text-muted-foreground">Giá cao, mua hãng khác...</p>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="leads" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60">
            <TabsTrigger value="leads" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Phễu Cơ Hội Bán Hàng ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Danh Bạ Khách Hàng ({customers.length})
            </TabsTrigger>
          </TabsList>

          {/* Toggle Kanban / Table */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 border border-border/60 self-start">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-card text-indigo-500 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-card text-indigo-500 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
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
                    } ${isOver ? 'ring-2 ring-indigo-500 scale-[1.01]' : 'border-border/60'}`}
                  >
                    {/* Header Cột */}
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/40">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
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
                          <div key={i} className="h-28 rounded-2xl bg-muted/60 skeleton-shimmer" />
                        ))
                      ) : columnLeads.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 text-[11px] text-muted-foreground">
                          Thả cơ hội vào đây
                        </div>
                      ) : (
                        columnLeads.map((lead) => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={() => handleDragStart(lead)}
                            className="group cursor-grab active:cursor-grabbing rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-3.5 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <h5 className="text-xs font-bold text-foreground group-hover:text-indigo-500 transition-colors">
                                {lead.customer_name || 'Khách hàng mới'}
                              </h5>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(lead.created_at)}
                              </span>
                            </div>

                            {/* Số điện thoại */}
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                              <Phone className="h-3 w-3 text-muted-foreground/60" />
                              <a href={`tel:${lead.customer_phone}`} className="hover:underline hover:text-foreground">
                                {lead.customer_phone}
                              </a>
                            </div>

                            {/* Model xe quan tâm */}
                            {lead.model_name && (
                              <div className="mt-2 flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-500 border border-indigo-500/20">
                                <Car className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.model_name}</span>
                              </div>
                            )}

                            {lead.notes && (
                              <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2 italic">
                                &ldquo;{lead.notes}&rdquo;
                              </p>
                            )}

                            {/* Nút hành động */}
                            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                              {lead.status === 'WON' ? (
                                <Button
                                  variant="brand"
                                  size="sm"
                                  className="w-full h-6 text-[10px] py-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                                  onClick={() => router.push('/sales')}
                                >
                                  <ShoppingBag className="mr-1 h-3 w-3" />
                                  Lên Đơn Bán Xe
                                </Button>
                              ) : (
                                <button
                                  onClick={() => handleQuickAdvance(lead)}
                                  disabled={lead.status === 'LOST'}
                                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 ml-auto"
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
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs bg-card/70 border-border/60 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20"
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
