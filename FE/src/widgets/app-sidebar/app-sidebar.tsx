'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/shared/store/ui-store';
import { useAuthStore } from '@/shared/store/auth-store';
import { NAVIGATION_ITEMS, NavItem, UserRole } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/utils';
import {
  LayoutDashboard,
  Car,
  Users,
  ShoppingBag,
  Wrench,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string, strokeWidth?: number }>> = {
  LayoutDashboard,
  Car,
  Users,
  ShoppingBag,
  Wrench,
  Receipt,
  Settings,
};

interface SidebarContentProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export function SidebarNavContent({ isMobile = false, onItemClick }: SidebarContentProps) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();
  const { user, logout } = useAuthStore();

  const userRole = (user?.role || 'superadmin') as UserRole;
  const isCollapsed = !isMobile && sidebarCollapsed;

  const filteredNavItems = NAVIGATION_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
  );

  const roleLabels: Record<string, string> = {
    superadmin: 'Giám đốc',
    branch_manager: 'QL Chi nhánh',
    salesperson: 'Sales',
    accountant: 'Kế toán',
    service_advisor: 'Cố vấn DV',
    mechanic: 'Thợ máy',
  };

  return (
    <div className="flex h-full flex-col">
      {/* ─── Brand Logo ─── */}
      <div className="flex h-[64px] shrink-0 items-center border-b border-slate-100 px-4">
        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center gap-3 overflow-hidden group"
        >
          {/* Logo icon: Soft Indigo hexagon with car */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-indigo-100">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
            <Car className="relative z-10 h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-black text-sm tracking-tight text-slate-800 truncate">
                CAR ERP
                <span className="ml-1 rounded px-1.5 py-0.5 bg-indigo-50 text-[9px] font-bold text-indigo-600 tracking-widest align-middle">
                  PRO
                </span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                Automotive Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ─── Navigation Section Label ─── */}
      {(!isCollapsed || isMobile) && (
        <div className="px-5 pt-6 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nghiệp Vụ
          </span>
        </div>
      )}

      {/* ─── Navigation Items ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filteredNavItems.map((item: NavItem, i: number) => {
          const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              title={isCollapsed ? item.title : undefined}
              style={{ animationDelay: `${i * 0.04}s` }}
              className={cn(
                'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 select-none animate-slide-in-left',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                isCollapsed && !isMobile && 'justify-center px-2'
              )}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-500" />
              )}

              <Icon
                className={cn(
                  'shrink-0 transition-colors',
                  isCollapsed && !isMobile ? 'h-5 w-5' : 'h-[18px] w-[18px]',
                  isActive
                    ? 'text-indigo-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {(!isCollapsed || isMobile) && (
                <>
                  <span className="truncate flex-1">{item.title}</span>
                  {item.badge && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── User Footer ─── */}
      <div className="shrink-0 border-t border-slate-100 p-3 space-y-2">
        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]',
            isCollapsed && !isMobile && 'justify-center px-2'
          )}
        >
          {/* Avatar with role color */}
          <div className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-xs shadow-sm',
            isCollapsed && !isMobile ? 'h-8 w-8' : 'h-8 w-8'
          )}>
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[13px] font-extrabold text-slate-800 truncate leading-none">
                {user?.username || 'Guest'}
              </p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider truncate mt-1">
                {roleLabels[user?.role || ''] || user?.role || 'User'}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[12px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all',
            isCollapsed && !isMobile && 'justify-center px-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'relative hidden lg:flex flex-col border-r border-slate-200 transition-all duration-300 ease-in-out z-30',
        'bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
        sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      )}
    >
      {/* Soft Indigo accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-sky-400 to-transparent z-10 opacity-80" />

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-4 top-[20px] z-50 flex h-8 w-8 items-center justify-center rounded-full
                   bg-white border border-slate-200 shadow-sm
                   text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200
                   transition-all duration-200"
        title={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <SidebarNavContent />
    </aside>
  );
}
