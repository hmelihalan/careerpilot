import "server-only";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import {
  resumeAnalysisSchema,
  type ResumeAnalysis,
} from "@/src/lib/resume-analysis/schema";
import {
  resumeDocumentSchema,
} from "@/src/lib/resume-builder/schema";
import { requireUser } from "@/src/server/auth/require-user";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";
import type { SavedResumeAnalysisView } from "@/src/types/resume-builder";

export async function saveResumeAnalysis({
  userId,
  fileName,
  analysis,
  importedDraft,
}: {
  userId: string;
  fileName: string;
  analysis: ResumeAnalysis;
  importedDraft: ResumeDocument | null;
}) {
  return prisma.savedResumeAnalysis.upsert({
    where: { userId },
    create: {
      userId,
      fileName,
      analysis: analysis as unknown as Prisma.InputJsonValue,
      importedDraft: importedDraft
        ? (importedDraft as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
    update: {
      fileName,
      analysis: analysis as unknown as Prisma.InputJsonValue,
      importedDraft: importedDraft
        ? (importedDraft as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      appliedImprovementIndexes: [],
      draftImportedAt: null,
    },
    select: { id: true },
  });
}

export async function getSavedResumeAnalysisForCurrentUser(): Promise<
  SavedResumeAnalysisView | null
> {
  const userId = await requireUser();
  const saved = await prisma.savedResumeAnalysis.findUnique({ where: { userId } });
  if (!saved) return null;

  const analysis = resumeAnalysisSchema.safeParse(saved.analysis);
  const importedDraft = resumeDocumentSchema.safeParse(saved.importedDraft);
  if (!analysis.success) return null;

  return {
    id: saved.id,
    fileName: saved.fileName,
    analysis: analysis.data,
    importedDraft: importedDraft.success ? importedDraft.data : null,
    appliedImprovementIndexes: saved.appliedImprovementIndexes,
    draftImportedAt: saved.draftImportedAt?.toISOString() ?? null,
    updatedAt: saved.updatedAt.toISOString(),
  };
}
