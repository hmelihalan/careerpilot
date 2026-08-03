import "server-only";

import { notFound } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import { toApplicationDetailViewModel } from "@/src/server/applications/application-mappings";
import type { ApplicationDetailViewModel } from "@/src/types/application";

export async function getApplicationDetailForCurrentUser(
  slug: string,
): Promise<ApplicationDetailViewModel> {
  const userId = await requireUser();
  const application = await prisma.application.findFirst({
    where: {
      userId,
      slug,
    },
    include: {
      material: true,
      notes: {
        orderBy: { createdAt: "desc" },
      },
      reminders: {
        orderBy: [{ completedAt: "asc" }, { remindAt: "asc" }],
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
      },
    },
  });

  if (!application) {
    notFound();
  }

  return toApplicationDetailViewModel(application);
}
