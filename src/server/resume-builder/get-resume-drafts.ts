import "server-only";

import { prisma } from "@/src/lib/prisma";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import { requireUser } from "@/src/server/auth/require-user";
import type { ResumeListItem } from "@/src/types/resume-builder";

function hasText(value: string) {
  return value.trim().length > 0;
}

export async function getResumeDraftsForCurrentUser(): Promise<ResumeListItem[]> {
  const userId = await requireUser();
  const records = await prisma.resumeDraft.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      language: true,
      content: true,
      updatedAt: true,
    },
  });

  return records.map((record) => {
    const parsed = resumeDocumentSchema.safeParse(record.content);
    const draft = parsed.success ? parsed.data : null;
    const sections = draft
      ? [
          hasText(draft.summary),
          draft.experience.length > 0,
          draft.education.length > 0,
          draft.skills.length > 0,
          draft.projects.length > 0 || draft.certifications.length > 0,
        ]
      : [];

    return {
      id: record.id,
      title: draft?.title ?? record.title,
      language: draft?.language ?? (record.language === "tr" ? "tr" : "en"),
      fullName: draft?.contact.fullName ?? "",
      headline: draft?.contact.headline ?? "",
      completedSections: sections.filter(Boolean).length,
      totalSections: 5,
      updatedAt: record.updatedAt.toISOString(),
    };
  });
}
