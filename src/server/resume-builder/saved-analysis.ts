import "server-only";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import {
  resumeAnalysisSchema,
  type ResumeAnalysis,
} from "@/src/lib/resume-analysis/schema";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";
import { requireUser } from "@/src/server/auth/require-user";
import type {
  ResumeAnalysisListItem,
  SavedResumeAnalysisView,
} from "@/src/types/resume-builder";

type SavedAnalysisRecord = {
  id: string;
  fileName: string;
  originalFileSize: number | null;
  originalMimeType: string | null;
  provider: string | null;
  model: string | null;
  characterCount: number | null;
  analysis: Prisma.JsonValue;
  importedDraft: Prisma.JsonValue | null;
  appliedImprovementIndexes: number[];
  draftImportedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseProvider(value: string | null): "groq" | "ollama" | null {
  return value === "groq" || value === "ollama" ? value : null;
}

function toSavedAnalysisView(
  saved: SavedAnalysisRecord,
): SavedResumeAnalysisView | null {
  const analysis = resumeAnalysisSchema.safeParse(saved.analysis);
  const importedDraft = resumeDocumentSchema.safeParse(saved.importedDraft);
  if (!analysis.success) return null;

  return {
    id: saved.id,
    fileName: saved.fileName,
    hasOriginalFile: saved.originalFileSize !== null,
    hasOriginalPdf:
      saved.originalFileSize !== null &&
      saved.originalMimeType === "application/pdf",
    provider: parseProvider(saved.provider),
    model: saved.model,
    characterCount: saved.characterCount,
    analysis: analysis.data,
    importedDraft: importedDraft.success ? importedDraft.data : null,
    appliedImprovementIndexes: saved.appliedImprovementIndexes,
    draftImportedAt: saved.draftImportedAt?.toISOString() ?? null,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  };
}

const savedAnalysisSelection = {
  id: true,
  fileName: true,
  originalFileSize: true,
  originalMimeType: true,
  provider: true,
  model: true,
  characterCount: true,
  analysis: true,
  importedDraft: true,
  appliedImprovementIndexes: true,
  draftImportedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function saveResumeAnalysis({
  userId,
  fileName,
  analysis,
  importedDraft,
  originalFile,
  originalMimeType,
  provider,
  model,
  characterCount,
}: {
  userId: string;
  fileName: string;
  analysis: ResumeAnalysis;
  importedDraft: ResumeDocument | null;
  originalFile: Uint8Array<ArrayBuffer>;
  originalMimeType: "application/pdf" | "text/plain";
  provider: "groq" | "ollama";
  model: string;
  characterCount: number;
}) {
  return prisma.savedResumeAnalysis.create({
    data: {
      userId,
      fileName,
      originalFile,
      originalMimeType,
      originalFileSize: originalFile.byteLength,
      provider,
      model,
      characterCount,
      analysis: analysis as unknown as Prisma.InputJsonValue,
      importedDraft: importedDraft
        ? (importedDraft as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
    select: { id: true },
  });
}

export async function getSavedResumeAnalysisForCurrentUser(
  analysisId?: string | null,
): Promise<SavedResumeAnalysisView | null> {
  const userId = await requireUser();
  const saved = await prisma.savedResumeAnalysis.findFirst({
    where: analysisId ? { id: analysisId, userId } : { userId },
    orderBy: analysisId ? undefined : { updatedAt: "desc" },
    select: savedAnalysisSelection,
  });
  return saved ? toSavedAnalysisView(saved) : null;
}

export async function getSavedResumeAnalysesForCurrentUser(): Promise<
  ResumeAnalysisListItem[]
> {
  const userId = await requireUser();
  const records = await prisma.savedResumeAnalysis.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
    select: savedAnalysisSelection,
  });

  return records.flatMap((record) => {
    const saved = toSavedAnalysisView(record);
    if (!saved) return [];
    return [
      {
        id: saved.id,
        fileName: saved.fileName,
        hasOriginalFile: saved.hasOriginalFile,
        hasOriginalPdf: saved.hasOriginalPdf,
        provider: saved.provider,
        model: saved.model,
        characterCount: saved.characterCount,
        overallScore: saved.analysis.overallScore,
        targetRole: saved.analysis.profile.targetRole,
        summary: saved.analysis.summary,
        improvementCount: saved.analysis.improvements.length,
        builderReady: saved.importedDraft !== null,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    ];
  });
}
