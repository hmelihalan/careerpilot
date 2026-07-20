import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck2,
  FileCheck2,
  FilePlus2,
  FileText,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityEvent = {
  title: string;
  description: string;
  date: string;
  time: string;
  icon: LucideIcon;
};

const events: readonly ActivityEvent[] = [
  {
    title: "Application created",
    description: "The Kron Full Stack Intern opportunity was added to CareerPilot.",
    date: "July 8, 2026",
    time: "09:15",
    icon: FilePlus2,
  },
  {
    title: "Status changed from Wishlist to Applied",
    description: "The application was submitted through LinkedIn.",
    date: "July 8, 2026",
    time: "10:02",
    icon: Workflow,
  },
  {
    title: "Resume Match analysis completed — 84%",
    description: "Software Engineering Resume was compared with the job requirements.",
    date: "July 8, 2026",
    time: "10:05",
    icon: Sparkles,
  },
  {
    title: "Cover letter generated",
    description: "A professional cover letter was created for the Kron application.",
    date: "July 9, 2026",
    time: "14:20",
    icon: FileText,
  },
  {
    title: "Status changed from Applied to Interview",
    description: "Kron invited you to continue to the technical interview stage.",
    date: "July 19, 2026",
    time: "16:10",
    icon: FileCheck2,
  },
  {
    title: "Technical interview scheduled",
    description: "The technical interview was scheduled for tomorrow at 14:30 on Google Meet.",
    date: "July 20, 2026",
    time: "09:30",
    icon: CalendarCheck2,
  },
];

export function ActivityTimeline() {
  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="border-b border-slate-100">
        <CardTitle>Activity</CardTitle>
        <p className="mt-1 text-xs text-slate-500">
          Application updates and recent actions.
        </p>
      </CardHeader>
      <CardContent>
        <ol aria-label="Application activity">
          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;

            return (
              <li key={event.title} className="relative flex gap-3.5 pb-5 last:pb-0">
                {!isLast && (
                  <span
                    className="absolute left-3.75 top-8 h-[calc(100%-2rem)] w-px bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5 sm:flex sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">{event.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {event.description}
                    </p>
                  </div>
                  <time className="mt-1 block shrink-0 text-[11px] text-slate-400 sm:mt-0 sm:text-right">
                    <span className="block">{event.date}</span>
                    <span className="mt-0.5 block">{event.time}</span>
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
