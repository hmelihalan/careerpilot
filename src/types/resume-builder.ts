import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";

export type SavedResumeAnalysisView = {
  id: string;
  fileName: string;
  hasOriginalFile: boolean;
  hasOriginalPdf: boolean;
  provider: "groq" | "ollama" | null;
  model: string | null;
  characterCount: number | null;
  analysis: ResumeAnalysis;
  importedDraft: ResumeDocument | null;
  appliedImprovementIndexes: number[];
  draftImportedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResumeAnalysisListItem = {
  id: string;
  fileName: string;
  hasOriginalFile: boolean;
  hasOriginalPdf: boolean;
  provider: "groq" | "ollama" | null;
  model: string | null;
  characterCount: number | null;
  overallScore: number;
  targetRole: string;
  summary: string;
  improvementCount: number;
  builderReady: boolean;
  createdAt: string;
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
