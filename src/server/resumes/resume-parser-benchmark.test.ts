import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractResumeText } from "./extract-resume-text";
import {
  parseResumeSections,
  type ParsedResumeSection,
  type ParsedResumeSectionsResult,
  type ResumeSectionType,
} from "./parse-resume-sections";

type ResumeParserBenchmarkReport = {
  filename: string;
  pageCount: number;
  characterCount: number;
  requiresOcr: boolean;
  detectedHeadingCount: number;
  detectedSectionCount: number;
  otherLineCount: number;
  otherRatio: number;
  requiresFallback: boolean;
  warnings: string[];
  sectionTypes: ResumeSectionType[];
  unknownHeadingCandidates: string[];
};

const fixtureDirectory = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "resumes",
);
const benchmarkFixtureFilenames = ["exres_1.pdf"] as const;

function findSection(
  result: ParsedResumeSectionsResult,
  type: ResumeSectionType,
): ParsedResumeSection {
  const section = result.sections.find((candidate) => candidate.type === type);

  expect(section, `Expected ${type} section to be detected`).toBeDefined();

  return section as ParsedResumeSection;
}

function assertKnownFixtureContent(
  filename: (typeof benchmarkFixtureFilenames)[number],
  result: ParsedResumeSectionsResult,
): void {
  if (filename === "exres_1.pdf") {
    const summary = findSection(result, "SUMMARY");
    const experience = findSection(result, "EXPERIENCE");
    const certifications = findSection(result, "CERTIFICATIONS");
    const education = findSection(result, "EDUCATION");

    expect(summary.heading).toBe("Summary");
    expect(summary.lines.join(" ")).toContain(
      "Seasoned SRE/DevOps leader currently on a career sabbatical",
    );
    expect(experience.heading).toBe("Work Experience");
    expect(experience.lines.join(" ")).toContain("Dunamu Inc. Seoul, S.Korea");
    expect(certifications.heading).toBe("Certificates");
    expect(certifications.lines.join(" ")).toContain(
      "AWS Certified Advanced Networking Specialty",
    );
    expect(education.heading).toBe("Education");
    expect(education.lines.join(" ")).toContain(
      "POSTECH(Pohang University of Science and Technology)",
    );
  }
}

function createReport(
  filename: string,
  extracted: Awaited<ReturnType<typeof extractResumeText>>,
  parsed: ParsedResumeSectionsResult,
): ResumeParserBenchmarkReport {
  return {
    filename,
    pageCount: extracted.pageCount,
    characterCount: extracted.characterCount,
    requiresOcr: extracted.requiresOcr,
    detectedHeadingCount: parsed.diagnostics.detectedHeadingCount,
    detectedSectionCount: parsed.diagnostics.detectedSectionCount,
    otherLineCount: parsed.diagnostics.otherLineCount,
    otherRatio: parsed.diagnostics.otherRatio,
    requiresFallback: parsed.diagnostics.requiresFallback,
    warnings: parsed.diagnostics.warnings,
    sectionTypes: parsed.sections.map((section) => section.type),
    unknownHeadingCandidates: parsed.diagnostics.unknownHeadingCandidates,
  };
}

describe("PDF resume parser benchmark", () => {
  it("extracts and parses every available text-based fixture", async () => {
    const availableFixtureFilenames = (await readdir(fixtureDirectory))
      .filter((filename) => filename.toLocaleLowerCase().endsWith(".pdf"))
      .sort();

    expect(availableFixtureFilenames).toEqual([...benchmarkFixtureFilenames]);

    const reports: ResumeParserBenchmarkReport[] = [];

    for (const filename of benchmarkFixtureFilenames) {
      const file = await readFile(path.join(fixtureDirectory, filename));
      const extracted = await extractResumeText(new Uint8Array(file));

      expect(extracted.pageCount).toBeGreaterThan(0);
      expect(extracted.text.length).toBeGreaterThan(0);
      expect(extracted.characterCount).toBeGreaterThan(0);
      expect(extracted.requiresOcr).toBe(false);

      const parsed = parseResumeSections(extracted.text);

      expect(parsed.diagnostics.lineCount).toBeGreaterThan(0);
      expect(parsed.diagnostics.otherRatio).toBeGreaterThanOrEqual(0);
      expect(parsed.diagnostics.otherRatio).toBeLessThanOrEqual(1);

      for (const [index, section] of parsed.sections.entries()) {
        expect(section.lines.length).toBeGreaterThan(0);
        expect(section.startLine).toBeLessThanOrEqual(section.endLine);
        expect([0.5, 1]).toContain(section.confidence);
        expect(section.source).toBe("RULE");

        const previousSection = parsed.sections[index - 1];

        if (previousSection) {
          expect(section.startLine).toBeGreaterThan(previousSection.startLine);
        }
      }

      assertKnownFixtureContent(filename, parsed);
      reports.push(createReport(filename, extracted, parsed));
    }

    console.log(
      "Resume parser benchmark report:\n",
      JSON.stringify(reports, null, 2),
    );
  });
});
