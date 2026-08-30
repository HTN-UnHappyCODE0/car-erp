import React from 'react';
import { AppSidebar } from '@/widgets/app-sidebar';
import { AppHeader } from '@/widgets/app-header';
import { ErrorBoundary } from '@/shared/components/ui/error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/60 text-slate-800">
      {/* Fixed App Sidebar */}
      <AppSidebar />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky Header */}
        <AppHeader />

        {/* Scrollable Page Content with Error Boundary */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <ErrorBoundary>
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
