import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";

export type SavedResumeAnalysisView = {
  id: string;
  fileName: string;
  analysis: ResumeAnalysis;
  importedDraft: ResumeDocument | null;
  appliedImprovementIndexes: number[];
  draftImportedAt: string | null;
  updatedAt: string;
};
