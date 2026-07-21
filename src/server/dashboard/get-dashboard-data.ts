import "server-only";

import { ApplicationStatus as PrismaApplicationStatus } from "@/src/generated/prisma/enums";
import type { ApplicationStatus } from "@/src/generated/prisma/enums";
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

  const countsByStatus: Record<ApplicationStatus, number> = {
    [PrismaApplicationStatus.WISHLIST]: 0,
    [PrismaApplicationStatus.APPLIED]: 0,
    [PrismaApplicationStatus.ASSESSMENT]: 0,
    [PrismaApplicationStatus.INTERVIEW]: 0,
    [PrismaApplicationStatus.OFFER]: 0,
    [PrismaApplicationStatus.REJECTED]: 0,
  };

  statusGroups.forEach((group) => {
    countsByStatus[group.status] = group._count._all;
  });

  const total = Object.values(countsByStatus).reduce(
    (sum, count) => sum + count,
    0,
  );
  const responded =
    countsByStatus[PrismaApplicationStatus.ASSESSMENT] +
    countsByStatus[PrismaApplicationStatus.INTERVIEW] +
    countsByStatus[PrismaApplicationStatus.OFFER] +
    countsByStatus[PrismaApplicationStatus.REJECTED];
  // MVP response rate: responded (Assessment, Interview, Offer, Rejected)
  // divided by eligible (Applied plus responded). Wishlist is excluded.
  const eligible =
    countsByStatus[PrismaApplicationStatus.APPLIED] + responded;
  const responseRate =
    eligible === 0 ? 0 : Math.round((responded / eligible) * 100);

  return {
    statusCounts: {
      total,
      wishlist: countsByStatus[PrismaApplicationStatus.WISHLIST],
      applied: countsByStatus[PrismaApplicationStatus.APPLIED],
      assessment: countsByStatus[PrismaApplicationStatus.ASSESSMENT],
      interview: countsByStatus[PrismaApplicationStatus.INTERVIEW],
      offer: countsByStatus[PrismaApplicationStatus.OFFER],
      rejected: countsByStatus[PrismaApplicationStatus.REJECTED],
    },
    responseRate,
    eligibleApplicationCount: eligible,
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
