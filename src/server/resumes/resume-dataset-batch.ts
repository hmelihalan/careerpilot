import { createHash } from "node:crypto";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  extractResumeLayout,
  MULTI_COLUMN_WARNING_PREFIX,
} from "./extract-resume-layout";
import {
  RESUME_DATASET_SCHEMA_VERSION,
  type ResumeDatasetDistributionSummary,
  type ResumeDatasetDocument,
  type ResumeDatasetDuplicateGroup,
  type ResumeDatasetExtractionReport,
  type ResumeDatasetFailure,
} from "./resume-dataset-schema";

export const RESUME_DATASET_FILENAME = "resumes.v1.jsonl";
export const RESUME_DATASET_REPORT_FILENAME = "extraction-report.v1.json";

export type ResumeDatasetExtractionInput = {
  data: Uint8Array;
  sourceFilename: string;
  sourceRelativePath: string;
  sourceFileSizeBytes: number;
  sourceSha256: string;
  resumeId: string;
};

export type ResumeDatasetDocumentExtractor = (
  input: ResumeDatasetExtractionInput,
) => Promise<ResumeDatasetDocument>;

export type RunResumeDatasetExtractionOptions = {
  rawDirectory: string;
  outputDirectory: string;
  workingDirectory?: string;
  concurrency?: number;
  extractDocument?: ResumeDatasetDocumentExtractor;
  onProgress?: (message: string) => void;
  generatedAt?: string;
};

export class ResumeDatasetBatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeDatasetBatchError";
  }
}

type ProcessedFile =
  | {
      status: "DOCUMENT";
      sourceRelativePath: string;
      sourceSha256: string;
      resumeId: string;
      document: ResumeDatasetDocument;
    }
  | {
      status: "FAILURE";
      sourceRelativePath: string;
      sourceSha256: string | null;
      resumeId: string | null;
      failure: ResumeDatasetFailure;
    };

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join("/");
}

function compareNormalizedPaths(first: string, second: string): number {
  const normalizedFirst = first.toLocaleLowerCase("en-US");
  const normalizedSecond = second.toLocaleLowerCase("en-US");

  if (normalizedFirst < normalizedSecond) return -1;
  if (normalizedFirst > normalizedSecond) return 1;
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

export async function discoverResumePdfFiles(
  rawDirectory: string,
): Promise<string[]> {
  async function walk(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const discovered = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) return walk(entryPath);
        if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".pdf")) {
          return [entryPath];
        }

        return [];
      }),
    );

    return discovered.flat();
  }

  const files = await walk(rawDirectory);

  return files.sort((first, second) =>
    compareNormalizedPaths(
      normalizeRelativePath(path.relative(rawDirectory, first)),
      normalizeRelativePath(path.relative(rawDirectory, second)),
    ),
  );
}

export function calculateResumeSha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function createResumeIdFromSha256(sourceSha256: string): string {
  const normalizedHash = sourceSha256.toLocaleLowerCase("en-US");

  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
    throw new Error("A complete lowercase-compatible SHA-256 hash is required.");
  }

  return `resume_${normalizedHash.slice(0, 16)}`;
}

export function assertJsonSafe(value: unknown, location = "root"): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number at ${location}.`);
    }
    return;
  }

  if (
    value === undefined ||
    typeof value === "bigint" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`Non-JSON value at ${location}.`);
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonSafe(entry, `${location}[${index}]`));
    return;
  }

  if (typeof value === "object") {
    if (
      value instanceof Map ||
      value instanceof Set ||
      value instanceof Date ||
      value instanceof Uint8Array
    ) {
      throw new Error(`Non-JSON object at ${location}.`);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Non-plain JSON object at ${location}.`);
    }

    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${location}.${key}`);
    }
    return;
  }

  throw new Error(`Unsupported JSON value at ${location}.`);
}

export function serializeJsonSafe(value: unknown): string {
  assertJsonSafe(value);
  return JSON.stringify(value);
}

export function findDuplicateContentGroups(
  hashesByRelativePath: ReadonlyMap<string, { sourceSha256: string; resumeId: string }>,
): ResumeDatasetDuplicateGroup[] {
  const pathsByHash = new Map<string, { resumeId: string; paths: string[] }>();

  for (const [sourceRelativePath, hash] of hashesByRelativePath) {
    const existing = pathsByHash.get(hash.sourceSha256);

    if (existing) {
      existing.paths.push(sourceRelativePath);
    } else {
      pathsByHash.set(hash.sourceSha256, {
        resumeId: hash.resumeId,
        paths: [sourceRelativePath],
      });
    }
  }

  return [...pathsByHash.entries()]
    .filter(([, group]) => group.paths.length > 1)
    .map(([sourceSha256, group]) => ({
      sourceSha256,
      resumeId: group.resumeId,
      sourceRelativePaths: [...group.paths].sort(compareNormalizedPaths),
    }))
    .sort((first, second) =>
      compareNormalizedPaths(
        first.sourceRelativePaths[0] ?? "",
        second.sourceRelativePaths[0] ?? "",
      ),
    );
}

function distribution(values: number[]): ResumeDatasetDistributionSummary {
  if (values.length === 0) {
    return { minimum: 0, median: 0, maximum: 0 };
  }

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;

  return {
    minimum: sorted[0] ?? 0,
    median,
    maximum: sorted[sorted.length - 1] ?? 0,
  };
}

export const extractResumeDatasetDocument: ResumeDatasetDocumentExtractor =
  async (input) => {
    const layout = await extractResumeLayout(input.data);

    return {
      schemaVersion: RESUME_DATASET_SCHEMA_VERSION,
      resumeId: input.resumeId,
      sourceFilename: input.sourceFilename,
      sourceRelativePath: input.sourceRelativePath,
      sourceFileSizeBytes: input.sourceFileSizeBytes,
      sourceSha256: input.sourceSha256,
      pageCount: layout.pageCount,
      characterCount: layout.characterCount,
      requiresOcr: layout.requiresOcr,
      extractionStatus: layout.requiresOcr ? "OCR_REQUIRED" : "SUCCESS",
      warnings: layout.warnings,
      pages: layout.pages,
    };
  };

async function processFile(
  filePath: string,
  rawDirectory: string,
  extractDocument: ResumeDatasetDocumentExtractor,
): Promise<ProcessedFile> {
  const sourceRelativePath = normalizeRelativePath(
    path.relative(rawDirectory, filePath),
  );
  const sourceFilename = path.basename(filePath);
  let data: Uint8Array;

  try {
    data = new Uint8Array(await readFile(filePath));
  } catch {
    return {
      status: "FAILURE",
      sourceRelativePath,
      sourceSha256: null,
      resumeId: null,
      failure: {
        sourceFilename,
        sourceRelativePath,
        errorCode: "FILE_READ_FAILED",
        message: "The PDF file could not be read.",
      },
    };
  }

  const sourceSha256 = calculateResumeSha256(data);
  const resumeId = createResumeIdFromSha256(sourceSha256);

  try {
    const document = await extractDocument({
      data,
      sourceFilename,
      sourceRelativePath,
      sourceFileSizeBytes: data.byteLength,
      sourceSha256,
      resumeId,
    });

    assertJsonSafe(document);

    return {
      status: "DOCUMENT",
      sourceRelativePath,
      sourceSha256,
      resumeId,
      document,
    };
  } catch {
    return {
      status: "FAILURE",
      sourceRelativePath,
      sourceSha256,
      resumeId,
      failure: {
        sourceFilename,
        sourceRelativePath,
        errorCode: "PDF_EXTRACTION_FAILED",
        message: "The PDF could not be converted into a dataset record.",
      },
    };
  }
}

export async function runResumeDatasetExtraction(
  options: RunResumeDatasetExtractionOptions,
): Promise<ResumeDatasetExtractionReport> {
  const rawDirectory = path.resolve(options.rawDirectory);
  const outputDirectory = path.resolve(options.outputDirectory);
  const workingDirectory = path.resolve(
    options.workingDirectory ?? process.cwd(),
  );
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4));
  const extractDocument = options.extractDocument ?? extractResumeDatasetDocument;
  const files = await discoverResumePdfFiles(rawDirectory);

  if (files.length === 0) {
    throw new ResumeDatasetBatchError(
      `No PDF files were found under ${normalizeRelativePath(
        path.relative(workingDirectory, rawDirectory),
      )}.`,
    );
  }

  await mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, RESUME_DATASET_FILENAME);
  const reportPath = path.join(outputDirectory, RESUME_DATASET_REPORT_FILENAME);
  const temporarySuffix = `.tmp-${process.pid}`;
  const temporaryOutputPath = `${outputPath}${temporarySuffix}`;
  const temporaryReportPath = `${reportPath}${temporarySuffix}`;
  const outputHandle = await open(temporaryOutputPath, "w");
  const failures: ResumeDatasetFailure[] = [];
  const warningsByFile: ResumeDatasetExtractionReport["warningsByFile"] = [];
  const hashesByRelativePath = new Map<
    string,
    { sourceSha256: string; resumeId: string }
  >();
  const lineCounts: number[] = [];
  const pageCounts: number[] = [];
  let successfulFiles = 0;
  let ocrRequiredFiles = 0;
  let totalPages = 0;
  let totalLines = 0;
  let totalCharacters = 0;
  let filesWithMultiColumnWarnings = 0;
  let filesWithNoReconstructedLines = 0;
  let processedFiles = 0;
  let outputHandleClosed = false;

  try {
    for (let offset = 0; offset < files.length; offset += concurrency) {
      const results = await Promise.all(
        files
          .slice(offset, offset + concurrency)
          .map((filePath) => processFile(filePath, rawDirectory, extractDocument)),
      );

      for (const result of results) {
        processedFiles += 1;

        if (result.sourceSha256 && result.resumeId) {
          hashesByRelativePath.set(result.sourceRelativePath, {
            sourceSha256: result.sourceSha256,
            resumeId: result.resumeId,
          });
        }

        if (result.status === "FAILURE") {
          failures.push(result.failure);
        } else {
          try {
            await outputHandle.write(`${serializeJsonSafe(result.document)}\n`);
          } catch {
            failures.push({
              sourceFilename: result.document.sourceFilename,
              sourceRelativePath: result.document.sourceRelativePath,
              errorCode: "JSON_SERIALIZATION_FAILED",
              message: "The extracted record was not valid JSON data.",
            });
            continue;
          }

          if (result.document.extractionStatus === "OCR_REQUIRED") {
            ocrRequiredFiles += 1;
          } else {
            successfulFiles += 1;
          }

          const documentLineCount = result.document.pages.reduce(
            (count, page) => count + page.lines.length,
            0,
          );
          totalPages += result.document.pageCount;
          totalLines += documentLineCount;
          totalCharacters += result.document.characterCount;
          lineCounts.push(documentLineCount);
          pageCounts.push(result.document.pageCount);

          if (documentLineCount === 0) filesWithNoReconstructedLines += 1;
          if (
            result.document.warnings.some((warning) =>
              warning.startsWith(MULTI_COLUMN_WARNING_PREFIX),
            )
          ) {
            filesWithMultiColumnWarnings += 1;
          }
          if (result.document.warnings.length > 0) {
            warningsByFile.push({
              sourceRelativePath: result.document.sourceRelativePath,
              warnings: result.document.warnings,
            });
          }
        }

        if (processedFiles % 100 === 0 || processedFiles === files.length) {
          options.onProgress?.(
            `Processed ${processedFiles}/${files.length} PDFs`,
          );
        }
      }
    }

    await outputHandle.close();
    outputHandleClosed = true;

    const duplicates = findDuplicateContentGroups(hashesByRelativePath);
    const report: ResumeDatasetExtractionReport = {
      schemaVersion: RESUME_DATASET_SCHEMA_VERSION,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      rawDirectory: normalizeRelativePath(
        path.relative(workingDirectory, rawDirectory),
      ),
      outputFile: normalizeRelativePath(
        path.relative(workingDirectory, outputPath),
      ),
      totalFiles: files.length,
      successfulFiles,
      ocrRequiredFiles,
      failedFiles: failures.length,
      duplicateContentFiles: duplicates.reduce(
        (count, group) => count + group.sourceRelativePaths.length - 1,
        0,
      ),
      totalPages,
      totalLines,
      totalCharacters,
      failures,
      duplicates,
      warningsByFile,
      dataQuality: {
        filesWithMultiColumnWarnings,
        filesWithNoReconstructedLines,
        linesPerResume: distribution(lineCounts),
        pagesPerResume: distribution(pageCounts),
      },
    };

    await writeFile(temporaryReportPath, `${serializeJsonSafe(report)}\n`, "utf8");
    await rename(temporaryOutputPath, outputPath);
    await rename(temporaryReportPath, reportPath);

    return report;
  } catch (error) {
    if (!outputHandleClosed) await outputHandle.close().catch(() => undefined);
    await Promise.all([
      rm(temporaryOutputPath, { force: true }),
      rm(temporaryReportPath, { force: true }),
    ]);
    throw error;
  }
}
