'use client';

import React, { useEffect, useState } from 'react';
import { useBranches, Branch } from '@/entities/branch';
import { useAuthStore } from '@/shared/store/auth-store';
import { DataTable, ColumnDef } from '@/widgets/data-table';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import {
  formatDate,
  formatDateTime,
  getUserTimeZone,
  getUserTimezoneOffsetFormatted,
} from '@/shared/lib/utils';
import { Settings, Building2, User, ShieldCheck, Globe, Clock, CheckCircle2, Bug, Send, AlertCircle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/shared/components/ui/button';
import { API_BASE_URL } from '@/shared/config/constants';

export function SettingsView() {
  const { data: branches = [], isLoading } = useBranches();
  const user = useAuthStore((s) => s.user);

  const [sentryFeStatus, setSentryFeStatus] = useState<string | null>(null);
  const [sentryBeStatus, setSentryBeStatus] = useState<string | null>(null);
  const sentryDsnConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  const handleTestSentryFE = async () => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      setSentryFeStatus('⚠️ CẢNH BÁO: NEXT_PUBLIC_SENTRY_DSN đang bị TRỐNG trên trình duyệt! Cần thêm biến NEXT_PUBLIC_SENTRY_DSN vào lúc build Docker Frontend.');
      return;
    }

    try {
      setSentryFeStatus('Đang gửi sự kiện lỗi lên Sentry...');
      const eventId = Sentry.captureException(
        new Error('Test Sentry Frontend Error từ Car ERP Settings View!'),
        {
          tags: {
            test: 'true',
            user: user?.username || 'anonymous',
            environment: process.env.NODE_ENV || 'production',
          },
        }
      );

      console.log('[Sentry Test Event ID]:', eventId);

      // Đảm bảo xả hàng đợi gửi lên máy chủ Sentry
      const flushed = await Sentry.flush(3000);
      console.log('[Sentry Test Flush Status]:', flushed);

      setSentryFeStatus(`✅ Đã gửi thành công lên Sentry! Mã Event ID: ${eventId} (Flush: ${flushed ? 'OK' : 'Queued'})`);
    } catch (err) {
      setSentryFeStatus(`❌ Lỗi khi gửi Sentry: ${(err as Error).message}`);
    }
  };

  const handleTriggerUncaughtError = () => {
    setSentryFeStatus('⚡ Đang kích hoạt Uncaught Crash (myUndefinedFunction)... Hãy kiểm tra F12 Console & Sentry!');
    setTimeout(() => {
      // @ts-expect-error Kích hoạt lỗi theo khuyến nghị của tài liệu Sentry
      window.myUndefinedFunction();
    }, 150);
  };

  const handleTestSentryBE = async () => {
    setSentryBeStatus('Đang gọi API Backend (/sentry-debug)...');
    try {
      const res = await fetch(`${API_BASE_URL}/sentry-debug`);
      const data = await res.json();
      if (data.success) {
        setSentryBeStatus(`✅ Backend Sentry OK! Mã Event ID: ${data.event_id || 'N/A'} (DSN: ${data.dsn_preview || 'OK'})`);
      } else {
        setSentryBeStatus(`⚠️ Backend phản hồi: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      setSentryBeStatus(`❌ Không thể gọi backend: ${(err as Error).message}`);
    }
  };

  const [deviceInfo, setDeviceInfo] = useState({
    timeZone: 'Asia/Ho_Chi_Minh',
    offset: 'GMT+7',
    locale: 'vi-VN',
    currentTime: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDeviceInfo({
        timeZone: getUserTimeZone(),
        offset: getUserTimezoneOffsetFormatted(now),
        locale: typeof navigator !== 'undefined' ? navigator.language : 'vi-VN',
        currentTime: formatDateTime(now, { includeSeconds: true }),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const branchColumns: ColumnDef<Branch>[] = [
    {
      header: 'Tên Chi Nhánh / Showroom',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <span className="font-bold text-xs text-[#202020]">{row.name}</span>
          <div className="font-mono text-[10px] text-[#ff682c] font-bold">
            {row.code}
          </div>
        </div>
      ),
    },
    {
      header: 'Địa Chỉ Showroom',
      accessorKey: 'address',
      cell: (row) => <span className="text-xs text-[#828282]">{row.address || '-'}</span>,
    },
    {
      header: 'Số Điện Thoại / MST',
      cell: (row) => (
        <div className="text-xs text-[#828282] font-mono">
          <div>SĐT: {row.phone || '-'}</div>
          <div className="text-[10px] text-[#828282]/80">MST: {row.tax_code || '-'}</div>
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
      cell: (row) => (
        <span suppressHydrationWarning className="text-xs text-[#828282] font-mono">
          {formatDate(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold tracking-tight text-[#202020] flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#202020] text-white">
            <Settings className="h-4.5 w-4.5" />
          </div>
          Cài Đặt Hệ Thống & Phân Quyền Chi Nhánh
        </h2>
        <p className="text-xs text-[#828282] mt-1">
          Quản lý danh sách showroom chi nhánh, cấu hình múi giờ hiển thị, giám sát Sentry và phân quyền tài khoản RBAC.
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* User Info Card */}
        <Card className="md:col-span-1 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <CardHeader className="pb-3 border-b border-[#e8e8e8]">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#202020]">
              <User className="h-4 w-4 text-[#ff682c]" />
              Thông Tin Tài Khoản
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div>
              <span className="text-[#828282] text-[11px] uppercase font-bold tracking-wider">Tên tài khoản:</span>
              <p className="font-bold text-[#202020] text-sm mt-0.5 font-mono">
                {user?.username || 'admin'}
              </p>
            </div>
            <div>
              <span className="text-[#828282] text-[11px] uppercase font-bold tracking-wider">Vai trò phân quyền:</span>
              <div className="mt-1">
                <Badge variant="graphite" className="uppercase font-mono font-bold">
                  {user?.role || 'superadmin'}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-[#828282] text-[11px] uppercase font-bold tracking-wider">Mã định danh nhân viên:</span>
              <p className="font-mono text-[#828282] mt-0.5 text-[11px]">
                {user?.employee_id || 'Chưa gắn hồ sơ'}
              </p>
            </div>
            <div className="pt-3 border-t border-[#e8e8e8]">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>Phiên đăng nhập bảo mật (JWT Session)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Timezone & Locale Card */}
        <Card className="md:col-span-2 border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
          <CardHeader className="pb-3 border-b border-[#e8e8e8]">
            <CardTitle className="text-sm font-bold flex items-center justify-between text-[#202020]">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#ff682c]" />
                Cấu Hình Múi Giờ Thiết Bị (Device Timezone)
              </div>
              <Badge variant="success" className="gap-1 font-mono text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Tự động nhận diện
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
            <p className="text-[#828282] leading-relaxed">
              Frontend tự động đọc múi giờ thực tế từ trình duyệt/thiết bị của người dùng và chuyển đổi toàn bộ thời gian nhận từ Backend (UTC/ISO) sang giờ địa phương chính xác.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#e8e8e8]">
                <div className="text-[11px] text-[#828282] font-semibold uppercase tracking-wider">Múi Giờ IANA</div>
                <div suppressHydrationWarning className="text-sm font-bold text-[#202020] font-mono mt-1 truncate">
                  {deviceInfo.timeZone}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#e8e8e8]">
                <div className="text-[11px] text-[#828282] font-semibold uppercase tracking-wider">Độ Lệch Chuẩn</div>
                <div suppressHydrationWarning className="text-sm font-bold text-[#ff682c] font-mono mt-1">
                  {deviceInfo.offset}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#e8e8e8]">
                <div className="text-[11px] text-[#828282] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Giờ Thực Tế Thiết Bị
                </div>
                <div suppressHydrationWarning className="text-sm font-bold text-[#202020] font-mono mt-1">
                  {deviceInfo.currentTime || '--:--:--'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sentry Monitoring & Test Card */}
      <Card className="border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
        <CardHeader className="pb-3 border-b border-[#e8e8e8] bg-[#fafafa]">
          <CardTitle className="text-sm font-bold flex items-center justify-between text-[#202020]">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-rose-500" />
              Kiểm Tra Giám Sát Lỗi Sentry (Observability & APM)
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#efefef] text-[#202020]">
              Sentry Diagnostic
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
          <p className="text-[#828282]">
            Sử dụng 2 nút bấm bên dưới để gửi sự kiện lỗi thử nghiệm lên 2 dự án tương ứng trên Sentry Dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sentry FE Box */}
            <div className="p-4 rounded-xl border border-[#e8e8e8] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-[#202020]">1. Dự Án Frontend (car-erp-frontend)</h4>
                    <span suppressHydrationWarning className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${sentryDsnConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {sentryDsnConfigured ? '🟢 DSN Sẵn Sàng' : '🔴 DSN Chưa Nhúng'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#828282] mt-0.5">Gửi Exception từ trình duyệt</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={handleTestSentryFE}
                    className="gap-1.5 rounded-xl shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" /> Bắn Lỗi FE
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTriggerUncaughtError}
                    className="gap-1.5 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    <Bug className="h-3.5 w-3.5" /> Crash Hàm
                  </Button>
                </div>
              </div>
              {sentryFeStatus && (
                <div className={`p-2.5 rounded-xl border text-[11px] font-medium flex items-center gap-1.5 ${sentryFeStatus.startsWith('⚠️') ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  {sentryFeStatus.startsWith('⚠️') ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                  <span className="font-mono">{sentryFeStatus}</span>
                </div>
              )}
            </div>

            {/* Sentry BE Box */}
            <div className="p-4 rounded-xl border border-[#e8e8e8] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#202020]">2. Dự Án Backend (car-erp-backend)</h4>
                  <p className="text-[11px] text-[#828282] mt-0.5">Gọi API /api/v1/sentry-debug</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSentryBE}
                  className="gap-1.5 rounded-xl border-[#202020] text-[#202020] hover:bg-[#efefef]"
                >
                  <Bug className="h-3.5 w-3.5" /> Bắn Lỗi BE
                </Button>
              </div>
              {sentryBeStatus && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>{sentryBeStatus}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches Table */}
      <Card className="border border-[#e8e8e8] bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(32,32,32,0.02)]">
        <CardHeader className="pb-3 border-b border-[#e8e8e8]">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#202020]">
            <Building2 className="h-4 w-4 text-[#ff682c]" />
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
  );
}
