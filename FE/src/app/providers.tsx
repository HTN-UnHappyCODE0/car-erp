'use client';

// Khởi tạo Sentry SDK trên Client Browser cho toàn bộ ứng dụng
import '../../sentry.client.config';

import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/shared/api/get-query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  // Đảm bảo client chỉ khởi tạo QueryClient 1 lần duy nhất trong vòng đời React component
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
