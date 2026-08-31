'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T;
  actionSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchKey,
  actionSlot,
  filterSlot,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Lọc dữ liệu client-side nếu có searchKey
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim() || !searchKey) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const val = item[searchKey as keyof T];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(query);
    });
  }, [data, searchQuery, searchKey]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 max-w-sm">
          <Input
            placeholder={searchPlaceholder}
            icon={<Search className="h-4 w-4 text-[#828282]" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="h-9.5 text-xs bg-[#f5f5f5] border-[#e8e8e8] rounded-full focus:border-[#ff682c] px-4"
          />
          {filterSlot}
        </div>

        {actionSlot && <div className="flex items-center gap-2 shrink-0">{actionSlot}</div>}
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_1px_3px_rgba(32,32,32,0.02)] overflow-hidden">
        <Table className="table-row-hover">
          <TableHeader className="bg-[#f5f5f5] border-b border-[#e8e8e8]">
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider text-[#828282] py-3.5',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={rIdx} className="border-b border-[#e8e8e8]/60">
                  {columns.map((_, cIdx) => (
                    <TableCell key={cIdx} className="py-3.5">
                      <Skeleton className="h-4 w-full max-w-[140px] rounded-md skeleton-shimmer" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-[#828282]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f5] mb-3 border border-[#e8e8e8]">
                      <Inbox className="h-6 w-6 stroke-[1.5] text-[#828282]" />
                    </div>
                    <p className="text-sm font-bold text-[#202020]">
                      Không có bản ghi dữ liệu nào
                    </p>
                    <p className="text-xs text-[#828282] mt-0.5">
                      {searchQuery
                        ? 'Không tìm thấy kết quả phù hợp với từ khóa.'
                        : 'Dữ liệu phân hệ đang trống.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className="border-b border-[#e8e8e8]/60 transition-colors duration-150"
                >
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className={cn('text-xs py-3 text-[#202020]', col.className)}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? '-')
                        : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e8e8e8] bg-[#f5f5f5]/60 text-xs text-[#828282] font-medium">
          <div>
            Hiển thị{' '}
            <span className="font-bold text-[#202020] font-mono">
              {filteredData.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-bold text-[#202020] font-mono">
              {Math.min(page * pageSize, filteredData.length)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-bold text-[#202020] font-mono">
              {filteredData.length}
            </span>{' '}
            dòng
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs rounded-full border-[#e8e8e8] bg-white text-[#202020] hover:bg-[#efefef]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1 text-[#828282]" />
              Trước
            </Button>
            <span className="px-2 font-mono font-bold text-[#202020]">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs rounded-full border-[#e8e8e8] bg-white text-[#202020] hover:bg-[#efefef]"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Sau
              <ChevronRight className="h-3.5 w-3.5 ml-1 text-[#828282]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
