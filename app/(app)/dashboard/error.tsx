"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
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
          We could not load your dashboard right now. Please try again.
        </p>
        <Button type="button" size="sm" className="mt-4" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
