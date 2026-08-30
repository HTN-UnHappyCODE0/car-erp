import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { invoiceQueries } from '@/entities/invoice';
import { FinanceView } from './finance-view';

export default async function FinancePage() {
  const queryClient = getQueryClient();

  // Server prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(invoiceQueries.list()),
    queryClient.prefetchQuery(invoiceQueries.transactions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinanceView />
    </HydrationBoundary>
  );
}
