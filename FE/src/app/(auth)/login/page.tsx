import React, { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';
import { Car, ShieldCheck, BarChart3, Database, Zap, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Phân quyền RBAC + RLS',
    desc: 'Đa chi nhánh, chống truy cập chéo dữ liệu',
    iconColor: 'text-[#202020]',
    bg: 'bg-[#efefef] border-[#e8e8e8]',
  },
  {
    icon: Database,
    title: 'Khoá bi quan VIN',
    desc: 'SELECT FOR UPDATE chống bán trùng xe',
    iconColor: 'text-[#ff682c]',
    bg: 'bg-[#ebe6dd] border-[#ded7cb]',
  },
  {
    icon: BarChart3,
    title: 'State Machine đơn hàng',
    desc: 'Workflow DRAFT → DELIVERED nghiêm ngặt',
    iconColor: 'text-[#816729]',
    bg: 'bg-[#f5f5f5] border-[#e8e8e8]',
  },
  {
    icon: TrendingUp,
    title: 'Tài chính Decimal',
    desc: 'Bất biến sai số với shopspring/decimal',
    iconColor: 'text-[#202020]',
    bg: 'bg-[#efefef] border-[#e8e8e8]',
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-white text-[#202020] overflow-hidden font-sans">
      {/* ═══ LEFT: Brand Hero Panel (Architectural Minimalist) ═══ */}
      <div className="relative hidden lg:flex w-[52%] flex-col justify-between p-12 overflow-hidden bg-[#f5f5f5] border-r border-[#e8e8e8]">
        {/* Ivory warm wash accent */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#ebe6dd]/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-[#ebe6dd]/40 blur-3xl" />

        {/* Top accent line (Graphite & Ember) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#202020] via-[#ff682c] to-transparent" />

        {/* ── Top: Logo ── */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-slide-up">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202020] text-white shadow-sm">
            <Car className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#ff682c] ring-2 ring-[#f5f5f5]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight text-[#202020] leading-none">
              CAR ERP{' '}
              <span className="rounded-full px-2 py-0.5 bg-[#efefef] text-[10px] font-bold text-[#ff682c] border border-[#e8e8e8] tracking-wider align-middle ml-1">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-[#828282] font-semibold tracking-wider uppercase mt-1">
              Ventriloc Edition
            </p>
          </div>
        </div>

        {/* ── Center: Headline + Features ── */}
        <div className="relative z-10 space-y-8 my-auto animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Tech badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e8e8] bg-white px-4 py-1.5 text-xs font-semibold text-[#202020] shadow-xs">
            <Zap className="h-3.5 w-3.5 text-[#ff682c]" />
            Next.js 15 · Go Gin · PostgreSQL RLS
          </div>

          <div className="space-y-3.5">
            <h2 className="text-4xl font-heading font-bold tracking-tight leading-[1.15] text-[#202020]">
              Quản trị liền mạch từ
              <br />
              <span className="text-[#ff682c]">
                Kho xe đến Doanh thu.
              </span>
            </h2>
            <p className="text-sm text-[#4d4d4d] leading-relaxed max-w-md font-normal">
              Hệ thống ERP phân hệ đại lý ô tô: Khóa bi quan chống bán trùng số VIN, State Machine đơn hàng nghiêm ngặt, Kiểm soát Odometer xưởng dịch vụ và bảo mật Row-Level Security đa chi nhánh.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {FEATURES.map(({ icon: Icon, title, desc, iconColor, bg }, i) => (
              <div
                key={title}
                className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xs transition-transform hover:-translate-y-0.5 ${bg} animate-stagger-in`}
                style={{ animationDelay: `${0.15 + i * 0.05}s` }}
              >
                <div className={`p-2 rounded-xl bg-white shadow-xs shrink-0 border border-[#e8e8e8] ${iconColor}`}>
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs font-bold text-[#202020] leading-tight">{title}</p>
                  <p className="text-[11px] text-[#828282] mt-1 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Footer ── */}
        <div className="relative z-10 flex items-center justify-between text-[12px] font-medium text-[#828282] animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <span>© 2026 Car ERP Pro · Ventriloc Design</span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff682c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff682c]"></span>
            </span>
            Systems Operational
          </span>
        </div>
      </div>

      {/* ═══ RIGHT: Login Form Panel ═══ */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="relative z-10 w-full max-w-[420px] space-y-6 animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202020] text-white shadow-sm">
              <Car className="h-5.5 w-5.5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-heading font-bold text-xl tracking-tight text-[#202020]">
                CAR ERP <span className="text-[#ff682c] text-sm">PRO</span>
              </span>
              <p className="text-[10px] text-[#828282] font-semibold uppercase tracking-wider">Ventriloc Edition</p>
            </div>
          </div>

          {/* Form header */}
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-3xl font-heading font-bold text-[#202020] tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-sm text-[#828282] font-normal">
              Nhập thông tin xác thực để truy cập vào hệ thống
            </p>
          </div>

          <Suspense
            fallback={
              <div className="space-y-4 rounded-3xl bg-[#f5f5f5] border border-[#e8e8e8] p-8 shadow-sm">
                <Skeleton className="h-11 w-full bg-white" />
                <Skeleton className="h-11 w-full bg-white" />
                <Skeleton className="h-11 w-full bg-white" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Footer hint */}
          <p className="text-center text-[12px] font-medium text-[#828282]">
            Tài khoản mẫu: <span className="font-mono text-[#202020] font-bold">admin</span> / <span className="font-mono text-[#202020] font-bold">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
