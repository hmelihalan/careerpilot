import "server-only";

import { ApplicationStatus } from "@/src/generated/prisma/enums";
import { calculateDashboardMetrics } from "@/src/lib/dashboard/dashboard-metrics";
import { prisma } from "@/src/lib/prisma";
import {
  formatApplicationSalary,
  prismaStatusToUi,
} from "@/src/server/applications/application-mappings";
import { requireUser } from "@/src/server/auth/require-user";
import type {
  DashboardUpcomingDeadline,
  DashboardUpcomingReminder,
  DashboardUpcomingInterview,
  DashboardViewModel,
} from "@/src/types/dashboard";

function getInitials(company: string): string {
  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "AP";
}

function formatDate(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(value);
  } catch {
    return null;
  }
}

function toUpcomingDeadline(
  application: {
    id: string;
    slug: string;
    company: string;
    role: string;
    status: ApplicationStatus;
    location: string | null;
    deadline: Date | null;
  },
): DashboardUpcomingDeadline | null {
  if (!application.deadline) return null;

  const deadlineLabel = formatDate(application.deadline);
  if (!deadlineLabel) return null;

  return {
    id: application.id,
    slug: application.slug,
    company: application.company,
    role: application.role,
    status: prismaStatusToUi[application.status],
    location: application.location?.trim() || null,
    deadline: application.deadline.toISOString(),
    deadlineLabel,
  };
}

function formatDateTime(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  } catch {
    return null;
  }
}

function toUpcomingReminder(
  reminder: {
    id: string;
    title: string;
    remindAt: Date;
    application: { slug: string; company: string; role: string };
  },
  now: Date,
): DashboardUpcomingReminder | null {
  const remindAtLabel = formatDateTime(reminder.remindAt);
  if (!remindAtLabel) return null;

  return {
    id: reminder.id,
    slug: reminder.application.slug,
    company: reminder.application.company,
    role: reminder.application.role,
    title: reminder.title,
    remindAt: reminder.remindAt.toISOString(),
    remindAtLabel,
    overdue: reminder.remindAt < now,
  };
}

function toUpcomingInterview(interview: {
  id: string;
  title: string;
  roundNumber: number;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  application: { slug: string; company: string; role: string };
}): DashboardUpcomingInterview | null {
  const scheduledAtLabel = formatDateTime(interview.scheduledAt);
  if (!scheduledAtLabel) return null;
  return {
    id: interview.id,
    slug: interview.application.slug,
    company: interview.application.company,
    role: interview.application.role,
    initials: getInitials(interview.application.company),
    title: interview.title,
    roundNumber: interview.roundNumber,
    scheduledAt: interview.scheduledAt.toISOString(),
    scheduledAtLabel,
    durationMinutes: interview.durationMinutes,
    location: interview.location?.trim() || null,
    meetingUrl: interview.meetingUrl?.trim() || null,
  };
}

export async function getDashboardDataForCurrentUser(): Promise<DashboardViewModel | null> {
  const userId = await requireUser();
  const now = new Date();

  try {
    const [statusGroups, recentRecords, deadlineRecords, reminderRecords, interviewRecords] =
      await Promise.all([
      prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.application.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          slug: true,
          company: true,
          role: true,
          status: true,
          location: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          appliedAt: true,
          updatedAt: true,
        },
      }),
      prisma.application.findMany({
        where: {
          userId,
          deadline: { gt: now },
          status: { not: ApplicationStatus.REJECTED },
        },
        orderBy: { deadline: "asc" },
        take: 5,
        select: {
          id: true,
          slug: true,
          company: true,
          role: true,
          status: true,
          location: true,
          deadline: true,
        },
      }),
      prisma.applicationReminder.findMany({
        where: {
          completedAt: null,
          application: {
            userId,
            status: { not: ApplicationStatus.REJECTED },
          },
        },
        orderBy: { remindAt: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          remindAt: true,
          application: {
            select: { slug: true, company: true, role: true },
          },
        },
      }),
      prisma.applicationInterview.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: now },
          application: {
            userId,
            status: { not: ApplicationStatus.REJECTED },
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        select: {
          id: true,
          title: true,
          roundNumber: true,
          scheduledAt: true,
          durationMinutes: true,
          location: true,
          meetingUrl: true,
          application: {
            select: { slug: true, company: true, role: true },
          },
        },
      }),
    ]);

    const metrics = calculateDashboardMetrics(
      statusGroups.map((group) => ({
        status: group.status,
        count: group._count._all,
      })),
    );

    return {
      ...metrics,
      recentApplications: recentRecords.map((application) => ({
        id: application.id,
        slug: application.slug,
        initials: getInitials(application.company),
        company: application.company,
        role: application.role,
        status: prismaStatusToUi[application.status],
        location: application.location?.trim() || null,
        salary: formatApplicationSalary(
          application.salaryMin,
          application.salaryMax,
          application.currency,
        ),
        appliedAt: application.appliedAt
          ? formatDate(application.appliedAt)
          : null,
        updatedAt: formatDate(application.updatedAt) ?? "Date unavailable",
      })),
      upcomingDeadlines: deadlineRecords
        .map(toUpcomingDeadline)
        .filter((deadline): deadline is DashboardUpcomingDeadline => deadline !== null),
      upcomingReminders: reminderRecords
        .map((reminder) => toUpcomingReminder(reminder, now))
        .filter(
          (reminder): reminder is DashboardUpcomingReminder => reminder !== null,
        ),
      upcomingInterviews: interviewRecords
        .map(toUpcomingInterview)
        .filter(
          (interview): interview is DashboardUpcomingInterview => interview !== null,
        ),
    };
  } catch (error) {
    console.error("Failed to load dashboard data.", error);
    return null;
  }
}
