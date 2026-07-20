import Link from "next/link";
import { CalendarClock, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MockApplication } from "@/src/types/application";

type ApplicationCardProps = {
  application: MockApplication;
  applicationsPath: string;
};

export function ApplicationCard({
  application,
  applicationsPath,
}: ApplicationCardProps) {
  const card = (
    <article className="flex min-h-36 min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-2.5 shadow-none transition-colors group-hover:border-indigo-200 group-hover:bg-indigo-50/20">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
          {application.initials}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs text-slate-500" title={application.company}>
          {application.company}
        </p>
        <Badge className="h-5 shrink-0 rounded-md bg-indigo-50 px-1 text-[10px] font-medium text-indigo-700">
          <Sparkles className="size-2.5" aria-hidden="true" />
          {application.matchScore}%
        </Badge>
      </div>

      <h3 className="mt-2 truncate text-xs font-medium text-slate-950" title={application.role}>
        {application.role}
      </h3>

      <div className="mt-auto min-w-0 space-y-1.5 pt-2.5 text-[11px] text-slate-500">
        <p className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{application.location}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <CalendarClock className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">Updated {application.updatedAt}</span>
        </p>
      </div>
    </article>
  );

  return (
    <Link
      href={`${applicationsPath}/${application.slug}`}
      className="group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      aria-label={`View ${application.role} application at ${application.company}`}
    >
      {card}
    </Link>
  );
}
