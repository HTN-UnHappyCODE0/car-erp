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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-1 items-center gap-2 max-w-sm">
          <Input
            placeholder={searchPlaceholder}
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs bg-card/70 border-border/60 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20"
          />
          {filterSlot}
        </div>

        {actionSlot && <div className="flex items-center gap-2 shrink-0">{actionSlot}</div>}
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm overflow-hidden">
        <Table className="table-row-hover">
          <TableHeader className="bg-muted/40 border-b border-border/60">
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3',
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
                <TableRow key={rIdx} className="border-b border-border/40">
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
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mb-3 border border-border/50">
                      <Inbox className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Không có bản ghi dữ liệu nào
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                  className="border-b border-border/40 transition-colors duration-150"
                >
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className={cn('text-xs py-3', col.className)}>
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground font-medium">
          <div>
            Hiển thị{' '}
            <span className="font-bold text-foreground font-mono">
              {filteredData.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-bold text-foreground font-mono">
              {Math.min(page * pageSize, filteredData.length)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-bold text-foreground font-mono">
              {filteredData.length}
            </span>{' '}
            dòng
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg border-border/60 bg-card hover:bg-muted"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Trước
            </Button>
            <span className="px-2 font-mono font-bold text-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg border-border/60 bg-card hover:bg-muted"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Sau
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
