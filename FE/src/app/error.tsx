'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi toàn cục Next.js 15:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center bg-slate-50 text-slate-800">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 border border-rose-100 shadow-sm">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Hệ Thống Đang Gặp Sự Cố</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 font-medium">
        Đã có lỗi không mong muốn phát sinh trong quá trình xử lý yêu cầu. Thông tin lỗi đã được ghi nhận.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-slate-400">Mã lỗi: {error.digest}</p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="outline" className="rounded-xl">
            Về Trang Chủ
          </Button>
        </Link>
        <Button variant="brand" className="rounded-xl shadow-sm" onClick={() => reset()}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Thử Lại Ngay
        </Button>
      </div>
    </div>
  );
}
