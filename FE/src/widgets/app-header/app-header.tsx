'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/shared/store/ui-store';
import { useAuthStore } from '@/shared/store/auth-store';
import { useBranches } from '@/entities/branch';
import { NAVIGATION_ITEMS } from '@/shared/config/navigation';
import { SidebarNavContent } from '@/widgets/app-sidebar/app-sidebar';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import {
  Building2,
  Search,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Menu,
  Home,
  Check,
  Settings,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const roleLabels: Record<string, { label: string; color: string }> = {
  superadmin:      { label: 'Giám Đốc',     color: 'text-indigo-600' },
  branch_manager:  { label: 'QL Chi nhánh', color: 'text-orange-500' },
  salesperson:     { label: 'Sales',         color: 'text-blue-500' },
  accountant:      { label: 'Kế Toán',      color: 'text-emerald-500' },
  service_advisor: { label: 'Cố Vấn DV',   color: 'text-purple-500' },
  mechanic:        { label: 'Thợ Máy',     color: 'text-amber-500' },
};

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { activeBranchId, setActiveBranchId } = useUIStore();
  const { user, logout } = useAuthStore();
  const { data: branches = [] } = useBranches();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const roleInfo = roleLabels[user?.role || ''] ?? { label: user?.role ?? 'User', color: 'text-slate-400' };

  const handleBranchChange = (branchId: string) => {
    setActiveBranchId(branchId);
    queryClient.clear();
    queryClient.invalidateQueries();
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
    router.push('/login');
  };

  const currentNavItem = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-[60px] w-full items-center justify-between px-4 sm:px-5',
        'border-b border-border/60',
        'bg-background/90 backdrop-blur-md',
        'animate-fade-in'
      )}
    >
      {/* ─── Left: Mobile Menu + Breadcrumbs + Branch Switcher ─── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <div className="lg:hidden">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                title="Mở menu điều hướng"
              >
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[240px] bg-white border-r border-slate-200 shadow-xl">
              <SidebarNavContent
                isMobile
                onItemClick={() => setMobileSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Hệ Thống</span>
          </Link>
          {pathname !== '/' && (
            <>
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span className="font-semibold text-foreground/90">
                {currentNavItem?.title || 'Phân Hệ'}
              </span>
            </>
          )}
        </nav>

        {/* Branch Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'flex items-center gap-1.5 rounded-xl text-xs h-8 font-medium',
                'border-border/60 bg-muted/30 hover:bg-muted/60',
                'transition-all duration-200'
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="max-w-[110px] sm:max-w-[160px] truncate">
                {activeBranch ? activeBranch.name : 'Chọn Showroom...'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-40 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
              Chuyển Đổi Showroom
            </div>
            <DropdownMenuSeparator />
            {branches.map((b) => {
              const isSelected = (activeBranch?.id || branches[0]?.id) === b.id;
              return (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => handleBranchChange(b.id)}
                  className="flex items-center justify-between text-xs py-2.5 cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={cn('font-medium', isSelected && 'text-indigo-600 font-bold')}>
                      {b.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{b.code}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Right: Search + Theme + Profile ─── */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <div className="hidden xl:flex w-60">
          <Input
            placeholder="Tra cứu VIN, SĐT khách..."
            icon={<Search className="h-3.5 w-3.5" />}
            className="h-9 text-[13px] bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
          />
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/settings')}
          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          title="Cài đặt"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-border/60" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2.5 rounded-xl px-2 py-1.5',
              'hover:bg-muted/60 transition-all duration-200 focus:outline-none',
              'border border-transparent hover:border-border/60'
            )}>
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-8 w-8 shadow-sm">
                  <AvatarFallback className="text-[12px] font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                    {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              {/* Name + Role */}
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-foreground truncate max-w-[90px]">
                  {user?.username || 'Admin'}
                </span>
                <span className={cn('text-[9px] uppercase font-bold tracking-wider font-mono', roleInfo.color)}>
                  {roleInfo.label}
                </span>
              </div>
              <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* User header */}
            <div className="px-3 py-2.5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shadow-sm">
                  <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                    {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-foreground">{user?.username || 'admin'}</p>
                  <p className={cn('text-[9px] uppercase font-mono font-bold tracking-wide', roleInfo.color)}>
                    {roleInfo.label}
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-xs cursor-pointer gap-2.5 py-2.5">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              Hồ Sơ & Tài Khoản
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-indigo-500 focus:text-indigo-500 cursor-pointer gap-2.5 py-2.5"
            >
              <LogOut className="h-4 w-4" />
              Đăng Xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
