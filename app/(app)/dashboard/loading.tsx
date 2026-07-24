function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4" aria-label="Loading dashboard" aria-busy="true">
      <section>
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-7 w-12" />
            <SkeletonBlock className="mt-3 h-3 w-28 max-w-full" />
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-10">
        <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-7">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="mt-4 h-52 w-full" />
        </div>
        <div className="space-y-3 xl:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-4 h-28 w-full" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="mt-4 h-28 w-full" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="mt-4 h-48 w-full" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="mt-4 h-48 w-full" />
        </div>
      </section>
    </div>
  );
}
