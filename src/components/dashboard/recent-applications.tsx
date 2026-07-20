import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMockApplicationsBySlugs } from "@/src/constants/mock-applications";
import type { ApplicationStatus } from "@/src/types/application";

const applications = getMockApplicationsBySlugs([
  "kron-full-stack-intern",
  "insider-junior-web-developer",
  "atlassian-junior-engineer",
  "getir-junior-react-developer",
  "peak-frontend-intern",
]);

const statusStyles: Record<ApplicationStatus, string> = {
  Wishlist: "bg-slate-100 text-slate-700",
  Applied: "bg-blue-50 text-blue-700",
  Assessment: "bg-amber-50 text-amber-700",
  Interview: "bg-violet-50 text-violet-700",
  Offer: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
};

type RecentApplicationsProps = {
  applicationsPath: string;
};

export function RecentApplications({ applicationsPath }: RecentApplicationsProps) {
  return (
    <Card size="sm" className="border border-slate-200 shadow-none ring-0">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Applications</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">Your latest application activity.</p>
        </div>
        <Link
          href={applicationsPath}
          className="rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-190 text-left text-xs">
            <thead>
              <tr className="border-y bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-2 first:pl-4 sm:first:pl-6">Company</th>
                <th scope="col" className="px-4 py-2">Role</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2">Match</th>
                <th scope="col" className="px-4 py-2">Date</th>
                <th scope="col" className="px-4 py-2 text-right last:pr-4 sm:last:pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((application) => (
                <tr
                  key={application.id}
                  className="group text-slate-600 transition-colors hover:bg-indigo-50/30 focus-within:bg-indigo-50/30"
                >
                  <td className="px-4 py-2.5 first:pl-4 sm:first:pl-6">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
                        {application.initials}
                      </span>
                      <span className="font-medium text-slate-900">{application.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`${applicationsPath}/${application.slug}`}
                      className="rounded font-medium text-slate-700 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      {application.role}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={cn("rounded-md px-2 font-medium", statusStyles[application.status])}>
                      {application.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{application.matchScore}%</td>
                  <td className="px-4 py-2.5 text-slate-500">{application.appliedDate}</td>
                  <td className="px-4 py-2.5 text-right last:pr-4 sm:last:pr-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${application.role} at ${application.company}`}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
