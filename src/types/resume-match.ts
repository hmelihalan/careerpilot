import type { TailoredResumeChange } from "@/src/lib/resume-match/apply-suggestions";
import type { ResumeMatchResult } from "@/src/lib/resume-match/schema";

export type ApplicationResumeMatchView = {
  id: string;
  resumeVersionId: string;
  sourceResumeDraftId: string | null;
  resumeTitle: string;
  isSubmitted: boolean;
  submittedAt: string | null;
  result: ResumeMatchResult;
  acceptedSuggestionIndexes: number[];
  rejectedSuggestionIndexes: number[];
  tailoredResumeDraftId: string | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

export type ResumeTailoringContext = {
  matchId: string;
  company: string;
  role: string;
  sourceResumeTitle: string;
  changes: TailoredResumeChange[];
};
