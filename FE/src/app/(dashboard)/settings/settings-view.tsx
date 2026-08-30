'use client';

import React from 'react';
import { useBranches, Branch } from '@/entities/branch';
import { useAuthStore } from '@/shared/store/auth-store';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatDate } from '@/shared/lib/utils';
import { Settings, Building2, User, ShieldCheck } from 'lucide-react';

export function SettingsView() {
  const { data: branches = [], isLoading } = useBranches();
  const user = useAuthStore((s) => s.user);

  const branchColumns: ColumnDef<Branch>[] = [
    {
      header: 'Tên Chi Nhánh / Showroom',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <span className="font-bold text-xs text-foreground">{row.name}</span>
          <div className="font-mono text-[10px] text-indigo-500 font-bold">
            {row.code}
          </div>
        </div>
      ),
    },
    {
      header: 'Địa Chỉ Showroom',
      accessorKey: 'address',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.address || '-'}</span>,
    },
    {
      header: 'Số Điện Thoại / MST',
      cell: (row) => (
        <div className="text-xs text-muted-foreground font-mono">
          <div>SĐT: {row.phone || '-'}</div>
          <div className="text-[10px] text-muted-foreground/70">MST: {row.tax_code || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'status',
      cell: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'secondary'} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Ngày Thành Lập',
      accessorKey: 'created_at',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500">
            <Settings className="h-4.5 w-4.5" />
          </div>
          Cài Đặt Hệ Thống & Phân Quyền Chi Nhánh
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý danh sách showroom chi nhánh, thông tin người dùng và phân quyền RBAC.
        </p>
      </div>

      {/* User Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-indigo-500" />
              Thông Tin Tài Khoản
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">Tên tài khoản:</span>
              <p className="font-bold text-foreground text-sm mt-0.5 font-mono">
                {user?.username || 'admin'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">Vai trò phân quyền:</span>
              <div className="mt-1">
                <Badge variant="default" className="uppercase font-mono font-bold bg-indigo-600 text-white">
                  {user?.role || 'superadmin'}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">Mã định danh nhân viên:</span>
              <p className="font-mono text-muted-foreground mt-0.5 text-[11px]">
                {user?.employee_id || 'Chưa gắn hồ sơ'}
              </p>
            </div>
            <div className="pt-3 border-t border-border/40">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>Phiên đăng nhập bảo mật (JWT Session)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branches Table */}
        <Card className="md:col-span-2 border-border/60 bg-card/90 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Danh Sách Chi Nhánh / Showroom Toàn Quốc
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <DataTable
              columns={branchColumns}
              data={branches}
              isLoading={isLoading}
              searchKey="name"
              searchPlaceholder="Tìm kiếm showroom..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
