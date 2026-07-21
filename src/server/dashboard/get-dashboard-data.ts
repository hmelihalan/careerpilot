import "server-only";

import { calculateDashboardMetrics } from "@/src/lib/dashboard/dashboard-metrics";
import { prisma } from "@/src/lib/prisma";
import { prismaStatusToUi } from "@/src/server/applications/application-mappings";
import { requireUser } from "@/src/server/auth/require-user";
import type { DashboardViewModel } from "@/src/types/dashboard";

function getInitials(company: string): string {
  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "AP";
}

function formatUpdatedDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

export async function getDashboardDataForCurrentUser(): Promise<DashboardViewModel> {
  const userId = await requireUser();
  const [statusGroups, recentRecords] = await Promise.all([
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        company: true,
        role: true,
        status: true,
        location: true,
        updatedAt: true,
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
      location: application.location?.trim() || "Location not specified",
      updatedAt: formatUpdatedDate(application.updatedAt),
    })),
  };
}
