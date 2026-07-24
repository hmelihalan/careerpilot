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

export async function getDashboardDataForCurrentUser(): Promise<DashboardViewModel | null> {
  const userId = await requireUser();
  const now = new Date();

  try {
    const [statusGroups, recentRecords, deadlineRecords] = await Promise.all([
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
    };
  } catch (error) {
    console.error("Failed to load dashboard data.", error);
    return null;
  }
}
