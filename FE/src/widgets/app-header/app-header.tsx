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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
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

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    queryClient.clear();
    router.push('/login');
  };

  const currentNavItem = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-20 flex h-[60px] w-full items-center justify-between px-4 sm:px-6',
          'border-b border-[#e8e8e8]',
          'bg-white/95 backdrop-blur-md',
          'animate-fade-in'
        )}
      >
        {/* Left: Mobile Trigger & Breadcrumb */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-8 w-8 p-0 text-[#828282] hover:text-[#202020] hover:bg-[#efefef] rounded-full"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Mở menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-white border-r border-[#e8e8e8]">
              <SidebarNavContent isMobile onItemClick={() => setMobileSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Clean Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-medium text-[#828282] hover:text-[#202020] transition-colors"
            >
              <Home className="h-3.5 w-3.5 text-[#828282]" />
              <span className="hidden sm:inline">Tổng quan</span>
            </Link>

            {currentNavItem && currentNavItem.href !== '/' && (
              <>
                <span className="text-[#828282]">/</span>
                <span className="font-semibold text-[#202020]">
                  {currentNavItem.title}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right: Branch Selector & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Branch Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2 rounded-full border border-[#e8e8e8]',
                  'bg-white px-3 py-1.5 text-xs font-medium text-[#202020]',
                  'shadow-xs hover:border-[#828282] hover:bg-[#fafafa] transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-[#202020]/20'
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-[#828282]" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate font-semibold">
                  {activeBranch?.name ?? 'Chi nhánh'}
                </span>
                <ChevronDown className="h-3 w-3 text-[#828282] ml-0.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl border border-[#e8e8e8] bg-white p-1.5 shadow-xl"
            >
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Chọn chi nhánh
              </div>
              <DropdownMenuSeparator className="bg-[#e8e8e8]" />
              {branches.map((branch) => {
                const isSelected = branch.id === activeBranchId;
                return (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() => handleBranchChange(branch.id)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-[#202020] text-white font-semibold'
                        : 'text-[#202020] hover:bg-[#efefef]'
                    )}
                  >
                    <span className="truncate">{branch.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-2" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2 rounded-full p-0.5 transition-all',
                  'border border-[#e8e8e8] hover:border-[#828282]',
                  'focus:outline-none focus:ring-2 focus:ring-[#202020]/20'
                )}
              >
                <Avatar className="h-7 w-7 rounded-full bg-[#efefef]">
                  <AvatarFallback className="text-[11px] font-bold text-[#202020] bg-[#efefef] rounded-full">
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-2xl border border-[#e8e8e8] bg-white p-1.5 shadow-xl"
            >
              <div className="px-3 py-2.5 border-b border-[#e8e8e8] mb-1">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 rounded-full bg-[#efefef]">
                    <AvatarFallback className="text-xs font-bold text-[#202020] bg-[#efefef] rounded-full">
                      {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD'}
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
                onClick={() => setShowLogoutDialog(true)}
                className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer gap-2.5 py-2 px-3 rounded-xl hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Đăng Xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không? Phiên làm việc hiện tại sẽ kết thúc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
