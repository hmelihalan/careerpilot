import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageContent } from "@/src/components/dashboard/dashboard-page-content";
import { getDashboardDataForCurrentUser } from "@/src/server/dashboard/get-dashboard-data";

export default async function DashboardPage() {
  const dashboard = await getDashboardDataForCurrentUser();

  if (!dashboard) {
    return (
      <Card size="sm" className="border border-slate-200 shadow-none ring-0">
        <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertCircle className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-base font-medium text-slate-950">
            Dashboard unavailable
          </h1>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            We could not load your dashboard right now. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <DashboardPageContent dashboard={dashboard} />;
}
