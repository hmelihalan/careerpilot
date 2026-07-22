import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  extractResumeTextFeatures,
  MULTI_COLUMN_WARNING_PREFIX,
  reconstructResumeDatasetLines,
  type ResumePdfTextFragment,
} from "./extract-resume-layout";
import {
  assertJsonSafe,
  calculateResumeSha256,
  createResumeIdFromSha256,
  extractResumeDatasetDocument,
  findDuplicateContentGroups,
  RESUME_DATASET_FILENAME,
  RESUME_DATASET_REPORT_FILENAME,
  ResumeDatasetBatchError,
  runResumeDatasetExtraction,
  serializeJsonSafe,
  type ResumeDatasetExtractionInput,
} from "./resume-dataset-batch";
import {
  RESUME_DATASET_SCHEMA_VERSION,
  type ResumeDatasetDocument,
} from "./resume-dataset-schema";

function fragment(
  overrides: Partial<ResumePdfTextFragment> & { text: string; x: number },
): ResumePdfTextFragment {
  return {
    y: 700,
    width: 30,
    height: 10,
    fontName: "BodyFont",
    ...overrides,
  };
}

function createMockDocument(
  input: ResumeDatasetExtractionInput,
): ResumeDatasetDocument {
  return {
    schemaVersion: RESUME_DATASET_SCHEMA_VERSION,
    resumeId: input.resumeId,
    sourceFilename: input.sourceFilename,
    sourceRelativePath: input.sourceRelativePath,
    sourceFileSizeBytes: input.sourceFileSizeBytes,
    sourceSha256: input.sourceSha256,
    pageCount: 1,
    characterCount: 5,
    requiresOcr: false,
    extractionStatus: "SUCCESS",
    warnings: [],
    pages: [
      {
        pageNumber: 1,
        width: 600,
        height: 800,
        lines: [],
      },
    ],
  };
}

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "careerpilot-resume-dataset-"),
  );

  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("resume dataset text features", () => {
  it("detects contact, URL, date, date range, and bullet features", () => {
    const features = extractResumeTextFeatures(
      "• EMAIL JANE@EXAMPLE.COM +1 (415) 555-0123 https://portfolio.dev Jan 2020 - Present",
    );

    expect(features).toMatchObject({
      hasEmail: true,
      hasPhone: true,
      hasUrl: true,
      hasDate: true,
      hasDateRange: true,
      startsWithBullet: true,
    });
    expect(features.wordCount).toBeGreaterThan(0);
    expect(features.characterCount).toBeGreaterThan(0);
  });

  it("does not classify an ordinary year as a phone number", () => {
    const features = extractResumeTextFeatures("Graduated in 2024");

    expect(features.hasDate).toBe(true);
    expect(features.hasPhone).toBe(false);
  });

  it.each([
    "Jan 2020 - Mar 2022",
    "2020 – 2022",
    "2020 — current",
    "2020 to present",
  ])("detects common date range format %s", (value) => {
    expect(extractResumeTextFeatures(value).hasDateRange).toBe(true);
  });

  it("keeps uppercase and digit ratios finite and bounded", () => {
    const features = extractResumeTextFeatures("ABC def 123");

    expect(features.uppercaseRatio).toBe(0.5);
    expect(features.digitRatio).toBeCloseTo(1 / 3);
    expect(Number.isFinite(features.uppercaseRatio)).toBe(true);
    expect(Number.isFinite(features.digitRatio)).toBe(true);
    expect(features.uppercaseRatio).toBeGreaterThanOrEqual(0);
    expect(features.uppercaseRatio).toBeLessThanOrEqual(1);
    expect(features.digitRatio).toBeGreaterThanOrEqual(0);
    expect(features.digitRatio).toBeLessThanOrEqual(1);
  });
});

describe("resume dataset line reconstruction", () => {
  it("groups fragments deterministically and orders them left to right", () => {
    const input = [
      fragment({ text: "World", x: 70 }),
      fragment({ text: "Hello", x: 10, width: 25 }),
    ];
    const first = reconstructResumeDatasetLines(input, 600, 800);
    const second = reconstructResumeDatasetLines([...input].reverse(), 600, 800);

    expect(first).toEqual(second);
    expect(first.lines).toHaveLength(1);
    expect(first.lines[0]?.text).toBe("Hello World");
    expect(first.lines[0]?.textItemCount).toBe(2);
  });

  it("uses geometric gaps for spaces while preserving punctuation", () => {
    const reconstructed = reconstructResumeDatasetLines(
      [
        fragment({ text: "Hello", x: 10, width: 25 }),
        fragment({ text: ",", x: 37, width: 2 }),
        fragment({ text: "world", x: 48, width: 25 }),
      ],
      600,
      800,
    );

    expect(reconstructed.lines[0]?.text).toBe("Hello, world");
  });

  it("splits page-scale horizontal gaps instead of joining columns", () => {
    const reconstructed = reconstructResumeDatasetLines(
      [
        fragment({ text: "Left column", x: 10, width: 60 }),
        fragment({ text: "Right column", x: 480, width: 70 }),
      ],
      600,
      800,
      2,
    );

    expect(reconstructed.lines.map((line) => line.text)).toEqual([
      "Left column",
      "Right column",
    ]);
    expect(reconstructed.warnings).toContain(
      `${MULTI_COLUMN_WARNING_PREFIX}_PAGE_2`,
    );
  });

  it("emits finite normalized coordinates within page bounds", () => {
    const reconstructed = reconstructResumeDatasetLines(
      [fragment({ text: "Geometry", x: 60, y: 400, width: 120, height: 20 })],
      600,
      800,
    );
    const line = reconstructed.lines[0];

    expect(line).toBeDefined();
    for (const value of [
      line?.normalizedX,
      line?.normalizedY,
      line?.normalizedWidth,
      line?.normalizedHeight,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("selects the dominant font by contributed characters", () => {
    const reconstructed = reconstructResumeDatasetLines(
      [
        fragment({
          text: "Hi",
          x: 10,
          width: 10,
          fontName: "FontA",
          height: 9,
        }),
        fragment({
          text: "LongerText",
          x: 30,
          width: 50,
          fontName: "FontB",
          height: 12,
        }),
        fragment({
          text: "More",
          x: 90,
          width: 25,
          fontName: "FontB",
          height: 14,
        }),
      ],
      600,
      800,
    );

    expect(reconstructed.lines[0]).toMatchObject({
      fontNames: ["FontA", "FontB"],
      dominantFontName: "FontB",
      dominantFontHeight: 13,
    });
  });
});

describe("resume dataset identity and JSON safety", () => {
  it("creates a stable content-derived resume ID", () => {
    const data = new TextEncoder().encode("stable resume bytes");
    const hash = calculateResumeSha256(data);

    expect(calculateResumeSha256(data)).toBe(hash);
    expect(createResumeIdFromSha256(hash)).toBe(
      `resume_${hash.slice(0, 16)}`,
    );
    expect(calculateResumeSha256(new TextEncoder().encode("different"))).not.toBe(
      hash,
    );
  });

  it("reports duplicate content hashes without dropping source paths", () => {
    const hash = "a".repeat(64);
    const groups = findDuplicateContentGroups(
      new Map([
        ["a.pdf", { sourceSha256: hash, resumeId: createResumeIdFromSha256(hash) }],
        ["copies/a.pdf", { sourceSha256: hash, resumeId: createResumeIdFromSha256(hash) }],
        [
          "unique.pdf",
          {
            sourceSha256: "b".repeat(64),
            resumeId: createResumeIdFromSha256("b".repeat(64)),
          },
        ],
      ]),
    );

    expect(groups).toEqual([
      {
        sourceSha256: hash,
        resumeId: createResumeIdFromSha256(hash),
        sourceRelativePaths: ["a.pdf", "copies/a.pdf"],
      },
    ]);
  });

  it("serializes JSON-native values and rejects unsafe values", () => {
    const safe = { value: 1, nested: [true, null, "text"] };

    expect(serializeJsonSafe(safe)).toBe(JSON.stringify(safe));
    expect(() => assertJsonSafe({ value: undefined })).toThrow("Non-JSON");
    expect(() => assertJsonSafe({ value: Number.NaN })).toThrow("Non-finite");
    expect(() => assertJsonSafe({ value: Number.POSITIVE_INFINITY })).toThrow(
      "Non-finite",
    );
    expect(() => assertJsonSafe(new Map())).toThrow("Non-JSON");
  });
});

describe("resume dataset extraction integration", () => {
  it("exports the public exres_1.pdf fixture structurally", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "resumes",
      "exres_1.pdf",
    );
    const data = new Uint8Array(await readFile(fixturePath));
    const sourceSha256 = calculateResumeSha256(data);
    const document = await extractResumeDatasetDocument({
      data,
      sourceFilename: "exres_1.pdf",
      sourceRelativePath: "exres_1.pdf",
      sourceFileSizeBytes: data.byteLength,
      sourceSha256,
      resumeId: createResumeIdFromSha256(sourceSha256),
    });

    expect(document.pageCount).toBeGreaterThan(0);
    expect(document.pages.every((page) => page.width > 0 && page.height > 0)).toBe(
      true,
    );
    expect(document).toMatchObject({
      schemaVersion: "1.0",
      sourceFilename: "exres_1.pdf",
      sourceSha256,
      extractionStatus: "SUCCESS",
      requiresOcr: false,
    });
    expect(document.pages.flatMap((page) => page.lines).length).toBeGreaterThan(
      0,
    );
    expect(() => assertJsonSafe(document)).not.toThrow();
  });

  it("fails safely when an input directory contains no PDFs", async () => {
    await withTemporaryDirectory(async (directory) => {
      const rawDirectory = path.join(directory, "raw");
      const outputDirectory = path.join(directory, "processed");
      await mkdir(rawDirectory);

      await expect(
        runResumeDatasetExtraction({ rawDirectory, outputDirectory }),
      ).rejects.toBeInstanceOf(ResumeDatasetBatchError);
      await expect(readdir(outputDirectory)).rejects.toThrow();
    });
  });

  it("reports a malformed PDF without aborting valid files", async () => {
    await withTemporaryDirectory(async (directory) => {
      const rawDirectory = path.join(directory, "raw");
      const outputDirectory = path.join(directory, "processed");
      await mkdir(path.join(rawDirectory, "nested"), { recursive: true });
      await writeFile(path.join(rawDirectory, "broken.pdf"), "broken");
      await writeFile(path.join(rawDirectory, "nested", "VALID.PDF"), "valid");

      const report = await runResumeDatasetExtraction({
        rawDirectory,
        outputDirectory,
        workingDirectory: directory,
        concurrency: 2,
        generatedAt: "2026-07-22T00:00:00.000Z",
        extractDocument: async (input) => {
          if (new TextDecoder().decode(input.data) === "broken") {
            throw new Error("internal parser details must not leak");
          }

          return createMockDocument(input);
        },
      });

      expect(report).toMatchObject({
        schemaVersion: "1.0",
        generatedAt: "2026-07-22T00:00:00.000Z",
        totalFiles: 2,
        successfulFiles: 1,
        ocrRequiredFiles: 0,
        failedFiles: 1,
      });
      expect(report.failures).toEqual([
        {
          sourceFilename: "broken.pdf",
          sourceRelativePath: "broken.pdf",
          errorCode: "PDF_EXTRACTION_FAILED",
          message: "The PDF could not be converted into a dataset record.",
        },
      ]);
      expect(JSON.stringify(report)).not.toContain("internal parser details");

      const jsonl = await readFile(
        path.join(outputDirectory, RESUME_DATASET_FILENAME),
        "utf8",
      );
      const records = jsonl.trim().split("\n").map((line) => JSON.parse(line));
      expect(records).toHaveLength(1);
      expect(records[0].sourceRelativePath).toBe("nested/VALID.PDF");

      const writtenReport = JSON.parse(
        await readFile(
          path.join(outputDirectory, RESUME_DATASET_REPORT_FILENAME),
          "utf8",
        ),
      );
      expect(writtenReport).toEqual(report);
      expect(
        (await readdir(outputDirectory)).some((name) => name.includes(".tmp-")),
      ).toBe(false);
    });
  });
});
