import "server-only";

import type { Resume as PrismaResumeRecord } from "@/src/generated/prisma/client";
import type { ResumeListItemViewModel } from "@/src/types/resume";

export function toResumeListItem(
  resume: PrismaResumeRecord,
): ResumeListItemViewModel {
  return {
    id: resume.id,
    name: resume.name,
    originalName: resume.originalName,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    isDefault: resume.isDefault,
    parseStatus: resume.parseStatus,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };
}
