'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
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
    <html lang="vi">
      <body className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center bg-slate-50 text-slate-800 font-sans antialiased">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 border border-rose-100 shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Hệ Thống Đang Gặp Sự Cố Toàn Cục
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 font-medium">
          Đã có lỗi không mong muốn phát sinh. Toàn bộ thông tin sự cố đã được tự động gửi tới trung tâm giám sát Sentry để kỹ sư xử lý.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-400">Mã sự cố: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Về Trang Chủ
          </button>
          <button
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#202020] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Thử Lại Ngay
          </button>
        </div>
      </body>
    </html>
  );
}
