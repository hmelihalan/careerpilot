export const RESUME_DATASET_SCHEMA_VERSION = "1.0" as const;

export type ResumeDatasetLine = {
  lineNumber: number;
  globalLineNumber: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  normalizedX: number;
  normalizedY: number;
  normalizedWidth: number;
  normalizedHeight: number;
  wordCount: number;
  characterCount: number;
  uppercaseRatio: number;
  digitRatio: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasUrl: boolean;
  hasDate: boolean;
  hasDateRange: boolean;
  startsWithBullet: boolean;
  textItemCount: number;
  fontNames: string[];
  dominantFontName: string | null;
  dominantFontHeight: number | null;
};

export type ResumeDatasetPage = {
  pageNumber: number;
  width: number;
  height: number;
  lines: ResumeDatasetLine[];
};

export type ResumeDatasetDocument = {
  schemaVersion: typeof RESUME_DATASET_SCHEMA_VERSION;
  resumeId: string;
  sourceFilename: string;
  sourceRelativePath: string;
  sourceFileSizeBytes: number;
  sourceSha256: string;
  pageCount: number;
  characterCount: number;
  requiresOcr: boolean;
  extractionStatus: "SUCCESS" | "OCR_REQUIRED";
  warnings: string[];
  pages: ResumeDatasetPage[];
};

export type ResumeDatasetFailure = {
  sourceFilename: string;
  sourceRelativePath: string;
  errorCode: string;
  message: string;
};

export type ResumeDatasetDuplicateGroup = {
  sourceSha256: string;
  resumeId: string;
  sourceRelativePaths: string[];
};

export type ResumeDatasetWarningsByFile = {
  sourceRelativePath: string;
  warnings: string[];
};

export type ResumeDatasetDistributionSummary = {
  minimum: number;
  median: number;
  maximum: number;
};

export type ResumeDatasetQualitySummary = {
  filesWithMultiColumnWarnings: number;
  filesWithNoReconstructedLines: number;
  linesPerResume: ResumeDatasetDistributionSummary;
  pagesPerResume: ResumeDatasetDistributionSummary;
};

export type ResumeDatasetExtractionReport = {
  schemaVersion: typeof RESUME_DATASET_SCHEMA_VERSION;
  generatedAt: string;
  rawDirectory: string;
  outputFile: string;
  totalFiles: number;
  successfulFiles: number;
  ocrRequiredFiles: number;
  failedFiles: number;
  duplicateContentFiles: number;
  totalPages: number;
  totalLines: number;
  totalCharacters: number;
  failures: ResumeDatasetFailure[];
  duplicates: ResumeDatasetDuplicateGroup[];
  warningsByFile: ResumeDatasetWarningsByFile[];
  dataQuality: ResumeDatasetQualitySummary;
};
