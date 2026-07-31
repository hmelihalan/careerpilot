import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";

export type SavedResumeAnalysisView = {
  id: string;
  fileName: string;
  hasOriginalPdf: boolean;
  analysis: ResumeAnalysis;
  importedDraft: ResumeDocument | null;
  appliedImprovementIndexes: number[];
  draftImportedAt: string | null;
  updatedAt: string;
};

export type ResumeListItem = {
  id: string;
  title: string;
  language: ResumeDocument["language"];
  fullName: string;
  headline: string;
  completedSections: number;
  totalSections: number;
  updatedAt: string;
};
