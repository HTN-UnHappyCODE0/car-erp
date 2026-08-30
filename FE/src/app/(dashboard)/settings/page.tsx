import React from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/api/get-query-client';
import { branchQueries } from '@/entities/branch';
import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const queryClient = getQueryClient();

  // Server prefetch
  await Promise.allSettled([
    queryClient.prefetchQuery(branchQueries.all()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsView />
    </HydrationBoundary>
  );
}
