import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { leadQueries } from '@/entities/lead';
import { customerQueries } from '@/entities/customer';
import { vehicleQueries } from '@/entities/vehicle';
import { CRMView } from './crm-view';

export default async function CRMPage() {
  const queryClient = getQueryClient();

  // Server prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(leadQueries.list()),
    queryClient.prefetchQuery(customerQueries.list()),
    queryClient.prefetchQuery(vehicleQueries.models()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CRMView />
    </HydrationBoundary>
  );
}
