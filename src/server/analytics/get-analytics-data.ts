import "server-only";

import { prisma } from "@/src/lib/prisma";
import { calculateAnalytics } from "@/src/lib/analytics/calculate-analytics";
import { prismaSourceToUi } from "@/src/server/applications/application-mappings";
import { requireUser } from "@/src/server/auth/require-user";
import type { AnalyticsViewModel } from "@/src/types/analytics";

export async function getAnalyticsDataForCurrentUser(): Promise<AnalyticsViewModel | null> {
  const userId = await requireUser();

  try {
    const applications = await prisma.application.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        source: true,
        createdAt: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
          select: {
            fromStatus: true,
            toStatus: true,
            changedAt: true,
          },
        },
        resumeVersions: {
          where: { isSubmitted: true },
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: {
            sourceResumeDraftId: true,
            resumeTitle: true,
          },
        },
      },
    });

    return calculateAnalytics(
      applications.map((application) => ({
        ...application,
        source: application.source ? prismaSourceToUi[application.source] : null,
        submittedResume: application.resumeVersions[0] ?? null,
      })),
    );
  } catch (error) {
    console.error("Failed to load analytics data.", error);
    return null;
  }
}
