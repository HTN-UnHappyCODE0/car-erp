import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { repairOrderQueries } from '@/entities/repair-order';
import { customerQueries } from '@/entities/customer';
import { vehicleQueries } from '@/entities/vehicle';
import { ServiceView } from './service-view';

export default async function ServicePage() {
  const queryClient = getQueryClient();

  // Server prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(repairOrderQueries.list()),
    queryClient.prefetchQuery(customerQueries.list()),
    queryClient.prefetchQuery(vehicleQueries.list()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ServiceView />
    </HydrationBoundary>
  );
}
