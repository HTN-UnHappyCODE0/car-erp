import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { vehicleQueries } from '@/entities/vehicle';
import { salesOrderQueries } from '@/entities/sales-order';
import { invoiceQueries } from '@/entities/invoice';
import { leadQueries } from '@/entities/lead';
import { repairOrderQueries } from '@/entities/repair-order';
import { DashboardView } from './dashboard-view';

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  // 1. Server Component Prefetching (Next.js 15 SSR)
  await Promise.allSettled([
    queryClient.prefetchQuery(vehicleQueries.list()),
    queryClient.prefetchQuery(salesOrderQueries.list()),
    queryClient.prefetchQuery(invoiceQueries.list()),
    queryClient.prefetchQuery(leadQueries.list()),
    queryClient.prefetchQuery(repairOrderQueries.list()),
  ]);

  // 2. Truyền state dehydrate xuống Client Component qua HydrationBoundary
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView />
    </HydrationBoundary>
  );
}
