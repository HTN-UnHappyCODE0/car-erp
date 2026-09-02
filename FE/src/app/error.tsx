'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[500px] w-full flex-col items-center justify-center p-6 text-center bg-white text-slate-800 rounded-3xl border border-[#e8e8e8] my-8 shadow-xs">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 border border-rose-100 shadow-sm">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[#202020]">Hệ Thống Đang Gặp Sự Cố</h2>
      <p className="mt-2 max-w-md text-sm text-[#828282] font-medium">
        Đã có lỗi không mong muốn phát sinh trong quá trình xử lý yêu cầu. Thông tin sự cố đã được tự động chuyển tới trung tâm giám sát Sentry.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-[#828282] bg-[#f5f5f5] px-2.5 py-1 rounded-md border border-[#e8e8e8]">
          Mã sự cố: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="outline" size="sm" className="rounded-xl">
            Về Trang Chủ
          </Button>
        </Link>
        <Button variant="brand" size="sm" className="rounded-xl shadow-xs" onClick={() => reset()}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Thử Lại Ngay
        </Button>
      </div>
    </div>
  );
}
