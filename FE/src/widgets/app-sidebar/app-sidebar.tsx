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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
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
    salesperson: 'Tư vấn bán xe',
    accountant: 'Kế toán',
    service_advisor: 'Cố vấn DV',
    mechanic: 'Kỹ thuật viên',
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ─── Brand Logo ─── */}
      <div className="flex h-[64px] shrink-0 items-center border-b border-[#e8e8e8] px-4">
        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center gap-3 overflow-hidden group"
        >
          {/* Logo icon: Solid Graphite with Ember Orange accent */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202020] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Car className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#ff682c] ring-2 ring-white" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-heading font-extrabold text-sm tracking-tight text-[#202020] truncate">
                CAR ERP
                <span className="ml-1.5 rounded-full px-2 py-0.5 bg-[#efefef] text-[10px] font-bold text-[#ff682c] border border-[#e8e8e8] align-middle">
                  PRO
                </span>
              </span>
              <span className="text-[10px] font-semibold text-[#828282] uppercase tracking-wider truncate mt-0.5">
                Ventriloc Edition
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ─── Navigation Section Label ─── */}
      {(!isCollapsed || isMobile) && (
        <div className="px-5 pt-5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
            Phân Hệ Quản Trị
          </span>
        </div>
      )}

      {/* ─── Navigation Items ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
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
              style={{ animationDelay: `${i * 0.03}s` }}
              className={cn(
                'group relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 select-none animate-slide-in-left',
                isActive
                  ? 'bg-[#efefef] text-[#202020] font-semibold shadow-xs border border-[#e8e8e8]'
                  : 'text-[#4d4d4d] hover:bg-[#f5f5f5] hover:text-[#202020]',
                isCollapsed && !isMobile && 'justify-center px-2'
              )}
            >
              {/* Active indicator: Ember Orange dot */}
              {isActive && !isCollapsed && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#ff682c] shrink-0" />
              )}

              <Icon
                className={cn(
                  'shrink-0 transition-colors',
                  isCollapsed && !isMobile ? 'h-5 w-5' : 'h-[18px] w-[18px]',
                  isActive
                    ? 'text-[#202020]'
                    : 'text-[#828282] group-hover:text-[#202020]'
                )}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              {(!isCollapsed || isMobile) && (
                <>
                  <span className="truncate flex-1">{item.title}</span>
                  {item.badge && (
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-[#202020] text-white'
                        : 'bg-[#efefef] text-[#4d4d4d]'
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
      <div className="shrink-0 border-t border-[#e8e8e8] p-3 space-y-2">
        {/* User info card */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl bg-[#f5f5f5] px-3 py-2.5 border border-[#e8e8e8]',
            isCollapsed && !isMobile && 'justify-center px-2'
          )}
        >
          {/* Avatar */}
          <div className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-[#202020] text-white font-bold text-xs shadow-xs',
            isCollapsed && !isMobile ? 'h-8 w-8' : 'h-8 w-8'
          )}>
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[13px] font-bold text-[#202020] truncate leading-none">
                {user?.username || 'Guest'}
              </p>
              <p className="text-[10px] font-semibold text-[#828282] uppercase tracking-wider truncate mt-1">
                {roleLabels[user?.role || ''] || user?.role || 'User'}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-[12px] font-medium text-[#828282] hover:text-[#202020] hover:bg-[#efefef] transition-all',
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
        'relative hidden lg:flex flex-col border-r border-[#e8e8e8] transition-all duration-300 ease-in-out z-30',
        'bg-white shadow-[2px_0_12px_rgba(32,32,32,0.02)]',
        sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      )}
    >
      {/* Top Hairline Accent (Graphite & Ember) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#202020] via-[#ff682c] to-transparent z-10" />

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-[20px] z-50 flex h-7 w-7 items-center justify-center rounded-full
                   bg-white border border-[#e8e8e8] shadow-sm
                   text-[#828282] hover:text-[#202020] hover:bg-[#efefef] hover:border-[#828282]/30
                   transition-all duration-200"
        title={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <SidebarNavContent />
    </aside>
  );
}
