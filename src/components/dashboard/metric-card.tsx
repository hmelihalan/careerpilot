import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  href: string;
  unchanged?: boolean;
};

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  href,
  unchanged = false,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      aria-label={`View ${label.toLowerCase()}`}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <Card
        size="sm"
        className="h-full border border-slate-200 shadow-none ring-0 transition-colors group-hover:border-indigo-200 group-hover:bg-indigo-50/30"
      >
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
    </Link>
  );
}
