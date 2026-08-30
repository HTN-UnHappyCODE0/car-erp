import { Skeleton } from '@/shared/components/ui/skeleton';

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full flex-col p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48 bg-slate-200/80 rounded-xl" />
        <Skeleton className="h-9 w-32 bg-slate-200/80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-white border border-slate-100 shadow-sm" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl bg-white border border-slate-100 shadow-sm" />
    </div>
  );
}
