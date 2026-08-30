import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { salesOrderQueries } from '@/entities/sales-order';
import { vehicleQueries } from '@/entities/vehicle';
import { customerQueries } from '@/entities/customer';
import { SalesView } from './sales-view';

export default async function SalesPage() {
  const queryClient = getQueryClient();

  // Server prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(salesOrderQueries.list()),
    queryClient.prefetchQuery(vehicleQueries.list({ status: 'IN_STOCK' })),
    queryClient.prefetchQuery(customerQueries.list()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesView />
    </HydrationBoundary>
  );
}
