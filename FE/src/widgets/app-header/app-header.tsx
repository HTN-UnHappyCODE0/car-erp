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
  superadmin:      { label: 'Giám Đốc',     color: 'text-[#202020]' },
  branch_manager:  { label: 'QL Chi nhánh', color: 'text-[#816729]' },
  salesperson:     { label: 'Tư Vấn Xe',   color: 'text-[#ff682c]' },
  accountant:      { label: 'Kế Toán',      color: 'text-emerald-700' },
  service_advisor: { label: 'Cố Vấn DV',   color: 'text-[#816729]' },
  mechanic:        { label: 'Kỹ Thuật',     color: 'text-[#4d4d4d]' },
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
  const roleInfo = roleLabels[user?.role || ''] ?? { label: user?.role ?? 'User', color: 'text-[#828282]' };

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
        'sticky top-0 z-20 flex h-[60px] w-full items-center justify-between px-4 sm:px-6',
        'border-b border-[#e8e8e8]',
        'bg-white/95 backdrop-blur-md',
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
                className="h-9 w-9 rounded-full text-[#4d4d4d] hover:text-[#202020] hover:bg-[#efefef]"
                title="Mở menu điều hướng"
              >
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[250px] bg-white border-r border-[#e8e8e8] shadow-xl">
              <SidebarNavContent
                isMobile
                onItemClick={() => setMobileSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-[#828282]">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-[#202020] transition-colors font-medium"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Hệ Thống</span>
          </Link>
          {pathname !== '/' && (
            <>
              <ChevronRight className="h-3 w-3 text-[#828282]" />
              <span className="font-semibold text-[#202020]">
                {currentNavItem?.title || 'Phân Hệ'}
              </span>
            </>
          )}
        </nav>

        {/* Branch Switcher (Pill style) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'flex items-center gap-1.5 rounded-full text-xs h-8 px-3.5 font-medium',
                'border-[#e8e8e8] bg-[#efefef] text-[#202020] hover:bg-[#e8e8e8]',
                'transition-all duration-200 shadow-xs'
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-[#ff682c] shrink-0" />
              <span className="max-w-[110px] sm:max-w-[170px] truncate">
                {activeBranch ? activeBranch.name : 'Chọn Showroom...'}
              </span>
              <ChevronDown className="h-3 w-3 text-[#828282] shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 border-[#e8e8e8] bg-white shadow-xl rounded-2xl p-1.5">
            <div className="px-3 py-2 text-[10px] font-bold text-[#828282] uppercase tracking-[0.1em]">
              Chuyển Đổi Showroom
            </div>
            <DropdownMenuSeparator className="bg-[#e8e8e8]" />
            {branches.map((b) => {
              const isSelected = (activeBranch?.id || branches[0]?.id) === b.id;
              return (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => handleBranchChange(b.id)}
                  className={cn(
                    'flex items-center justify-between text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-colors',
                    isSelected ? 'bg-[#efefef] text-[#202020] font-bold' : 'hover:bg-[#f5f5f5]'
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-[#828282] font-mono">{b.code}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#ff682c]" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Right: Search + Settings + Profile ─── */}
      <div className="flex items-center gap-2.5">
        {/* Global Search */}
        <div className="hidden xl:flex w-64">
          <Input
            placeholder="Tra cứu VIN, SĐT khách..."
            icon={<Search className="h-3.5 w-3.5 text-[#828282]" />}
            className="h-9 text-[13px] bg-[#f5f5f5] border-[#e8e8e8] focus:border-[#ff682c] rounded-full px-4"
          />
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/settings')}
          className="h-8.5 w-8.5 rounded-full text-[#4d4d4d] hover:text-[#202020] hover:bg-[#efefef] transition-all"
          title="Cài đặt hệ thống"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#e8e8e8]" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2.5 rounded-full pl-1.5 pr-3 py-1',
              'bg-[#f5f5f5] hover:bg-[#efefef] transition-all duration-200 focus:outline-none',
              'border border-[#e8e8e8]'
            )}>
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-7 w-7 shadow-xs">
                  <AvatarFallback className="text-[11px] font-bold bg-[#202020] text-white border-0">
                    {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot: Ember Orange */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#ff682c] ring-1.5 ring-white" />
              </div>
              {/* Name + Role */}
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-[#202020] truncate max-w-[90px]">
                  {user?.username || 'Admin'}
                </span>
                <span className={cn('text-[9px] uppercase font-bold tracking-wider', roleInfo.color)}>
                  {roleInfo.label}
                </span>
              </div>
              <ChevronDown className="hidden sm:block h-3 w-3 text-[#828282]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-[#e8e8e8] bg-white shadow-xl rounded-2xl p-1.5">
            {/* User header */}
            <div className="px-3 py-2.5 border-b border-[#e8e8e8]">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shadow-xs">
                  <AvatarFallback className="text-xs font-bold bg-[#202020] text-white border-0">
                    {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-bold text-[#202020]">{user?.username || 'admin'}</p>
                  <p className={cn('text-[10px] uppercase font-bold tracking-wide mt-0.5', roleInfo.color)}>
                    {roleInfo.label}
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="text-xs cursor-pointer gap-2.5 py-2 px-3 rounded-xl hover:bg-[#efefef] text-[#202020]">
              <UserIcon className="h-4 w-4 text-[#828282]" />
              Hồ Sơ & Cấu Hình
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#e8e8e8]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer gap-2.5 py-2 px-3 rounded-xl hover:bg-rose-50"
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
