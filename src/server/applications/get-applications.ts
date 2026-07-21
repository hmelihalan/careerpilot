import "server-only";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import { toApplicationListItem } from "@/src/server/applications/application-mappings";
import type { ApplicationListItem } from "@/src/types/application";

export async function getApplicationsForCurrentUser(): Promise<
  ApplicationListItem[]
> {
  const userId = await requireUser();
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return applications.map(toApplicationListItem);
}
