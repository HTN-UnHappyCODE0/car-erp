import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { vehicleQueries } from '@/entities/vehicle';
import { branchQueries } from '@/entities/branch';
import { InventoryView } from './inventory-view';

export default async function InventoryPage() {
  const queryClient = getQueryClient();

  // Server-side prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(vehicleQueries.list()),
    queryClient.prefetchQuery(vehicleQueries.models()),
    queryClient.prefetchQuery(branchQueries.all()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryView />
    </HydrationBoundary>
  );
}
