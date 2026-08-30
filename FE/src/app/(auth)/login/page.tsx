import React, { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';
import { Car, ShieldCheck, BarChart3, Database, Zap, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Phân quyền RBAC + RLS',
    desc: 'Đa chi nhánh, chống truy cập chéo dữ liệu',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: Database,
    title: 'Khoá bi quan VIN',
    desc: 'SELECT FOR UPDATE chống bán trùng xe',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 border-indigo-100',
  },
  {
    icon: BarChart3,
    title: 'State Machine đơn hàng',
    desc: 'Workflow DRAFT → DELIVERED nghiêm ngặt',
    color: 'text-purple-500',
    bg: 'bg-purple-50 border-purple-100',
  },
  {
    icon: TrendingUp,
    title: 'Tài chính Decimal',
    desc: 'Bất biến sai số với shopspring/decimal',
    color: 'text-sky-500',
    bg: 'bg-sky-50 border-sky-100',
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* ═══ LEFT: Brand Hero Panel (Light & Soft) ═══ */}
      <div className="relative hidden lg:flex w-[52%] flex-col justify-between p-12 overflow-hidden bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Soft Ambient Glows */}
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-indigo-50/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-sky-50/60 blur-3xl" />

        {/* Grid pattern overlay (very subtle) */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(215 28% 20%) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(215 28% 20%) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top accent line (Soft Indigo) */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-sky-400 to-transparent opacity-80" />

        {/* ── Top: Logo ── */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-slide-up">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden shadow-sm shadow-indigo-100">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
            <Car className="relative z-10 h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">
              CAR ERP{' '}
              <span className="rounded px-1.5 py-0.5 bg-indigo-100 text-[10px] font-bold text-indigo-700 tracking-widest align-middle">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase mt-0.5">
              Automotive Suite v2.0
            </p>
          </div>
        </div>

        {/* ── Center: Headline + Features ── */}
        <div className="relative z-10 space-y-8 my-auto animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Tech badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-bold text-indigo-600 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
            Next.js 15 · Go Gin · PostgreSQL RLS
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
              Quản trị liền mạch từ
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Kho xe đến Doanh thu.
              </span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md font-medium">
              Hệ thống ERP độc quyền cho đại lý ô tô: Khóa bi quan chống bán trùng số VIN, State Machine đơn hàng nghiêm ngặt, Kiểm soát Odometer xưởng dịch vụ và bảo mật Row-Level Security đa chi nhánh.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <div
                key={title}
                className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_2px_10px_rgba(0,0,0,0.015)] transition-transform hover:-translate-y-1 ${bg} animate-stagger-in`}
                style={{ animationDelay: `${0.2 + i * 0.08}s` }}
              >
                <div className={`p-2 rounded-xl bg-white shadow-sm shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs font-bold text-slate-700 leading-tight">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Footer ── */}
        <div className="relative z-10 flex items-center justify-between text-[12px] font-medium text-slate-400 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <span>© 2026 Car ERP Pro · All rights reserved</span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Systems Operational
          </span>
        </div>
      </div>

      {/* ═══ RIGHT: Login Form Panel ═══ */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 relative bg-slate-50/50">
        <div className="relative z-10 w-full max-w-[420px] space-y-6 animate-fade-slide-up" style={{ animationDelay: '0.15s' }}>
          {/* Mobile logo (only shown on small screens) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200">
              <Car className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-slate-800">CAR ERP <span className="text-indigo-600 text-sm">PRO</span></span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Automotive Suite</p>
            </div>
          </div>

          {/* Form header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Xin chào 👋
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Đăng nhập vào hệ thống quản trị đại lý của bạn
            </p>
          </div>

          <Suspense
            fallback={
              <div className="space-y-4 rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
                <Skeleton className="h-11 w-full bg-slate-50" />
                <Skeleton className="h-11 w-full bg-slate-50" />
                <Skeleton className="h-11 w-full bg-slate-50" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Footer hint */}
          <p className="text-center text-[12px] font-medium text-slate-400">
            Liên hệ IT Admin nếu bạn quên mật khẩu
          </p>
        </div>
      </div>
    </div>
  );
}
