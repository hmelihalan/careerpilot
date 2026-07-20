import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  unchanged?: boolean;
};

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  unchanged = false,
}: MetricCardProps) {
  return (
    <Card size="sm" className="border border-slate-200 shadow-none ring-0">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1.5 text-2xl font-medium tracking-tight text-slate-950">
              {value}
            </p>
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        </div>
        <p
          className={
            unchanged
              ? "mt-2 text-[11px] font-medium text-slate-500"
              : "mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600"
          }
        >
          {!unchanged && <ArrowUpRight className="size-3" aria-hidden="true" />}
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
