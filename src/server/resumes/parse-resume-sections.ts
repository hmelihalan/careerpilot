import "server-only";

export type ResumeSectionType =
  | "CONTACT"
  | "SUMMARY"
  | "EXPERIENCE"
  | "EDUCATION"
  | "SKILLS"
  | "PROJECTS"
  | "CERTIFICATIONS"
  | "OTHER";

export type ParsedResumeSection = {
  type: ResumeSectionType;
  heading: string | null;
  lines: string[];
  startLine: number;
  endLine: number;
  source: "RULE";
  confidence: number;
};

export type ResumeSectionDiagnostics = {
  lineCount: number;
  detectedHeadingCount: number;
  detectedSectionCount: number;
  otherLineCount: number;
  otherRatio: number;
  unknownHeadingCandidates: string[];
  warnings: string[];
  requiresFallback: boolean;
};

export type ParsedResumeSectionsResult = {
  sections: ParsedResumeSection[];
  diagnostics: ResumeSectionDiagnostics;
};

type RecognizedResumeSectionType = Exclude<ResumeSectionType, "OTHER">;

export const RESUME_SECTION_HEADING_ALIASES = {
  CONTACT: ["contact", "contact information", "personal information"],
  SUMMARY: [
    "summary",
    "professional summary",
    "executive summary",
    "profile",
    "professional profile",
    "career objective",
    "objective",
    "career overview",
  ],
  EXPERIENCE: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "work history",
    "relevant experience",
    "career history",
  ],
  EDUCATION: [
    "education",
    "education and training",
    "academic background",
    "academic history",
    "educational background",
    "education and coursework",
  ],
  SKILLS: [
    "skills",
    "technical skills",
    "core skills",
    "skill highlights",
    "highlights",
    "core competencies",
    "core qualifications",
    "qualifications",
    "areas of expertise",
    "computer skills",
    "key skills",
    "languages",
  ],
  PROJECTS: [
    "projects",
    "personal projects",
    "academic projects",
    "selected projects",
    "portfolio",
  ],
  CERTIFICATIONS: [
    "certifications",
    "certificates",
    "licenses",
    "licenses and certifications",
    "credentials",
    "professional development",
  ],
} as const satisfies Record<RecognizedResumeSectionType, readonly string[]>;

const headingLookup = new Map<string, RecognizedResumeSectionType>();

for (const [type, aliases] of Object.entries(
  RESUME_SECTION_HEADING_ALIASES,
) as Array<
  [RecognizedResumeSectionType, readonly string[]]
>) {
  for (const alias of aliases) {
    headingLookup.set(alias, type);
  }
}

const MAX_HEADING_CHARACTER_COUNT = 60;
const MAX_HEADING_WORD_COUNT = 7;
const OTHER_FALLBACK_RATIO = 0.6;
const RECOGNIZED_SECTION_CONFIDENCE = 1;
const OTHER_SECTION_CONFIDENCE = 0.5;

const TITLE_CONNECTORS = new Set([
  "&",
  "and",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

function collapseWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeResumeLine(value: string): string {
  return collapseWhitespace(value).replace(/[\u2010-\u2015\u2212]/g, "-");
}

export function normalizeHeadingCandidate(value: string): string | null {
  const normalizedLine = normalizeResumeLine(value);

  if (
    !normalizedLine ||
    normalizedLine.length > MAX_HEADING_CHARACTER_COUNT
  ) {
    return null;
  }

  const normalizedHeading = normalizedLine
    .replace(/[\s:;|•·▪◦●○‣-]+$/g, "")
    .trim()
    .toLocaleLowerCase("en-US");

  if (!normalizedHeading) {
    return null;
  }

  const wordCount = normalizedHeading.split(/\s+/).length;

  return wordCount <= MAX_HEADING_WORD_COUNT ? normalizedHeading : null;
}

export function detectSectionHeading(
  value: string,
): ResumeSectionType | null {
  const normalizedHeading = normalizeHeadingCandidate(value);

  return normalizedHeading
    ? (headingLookup.get(normalizedHeading) ?? null)
    : null;
}

function isPossibleUnknownHeading(value: string): boolean {
  if (/[.!?]$/.test(value)) {
    return false;
  }

  const normalizedHeading = normalizeHeadingCandidate(value);

  if (!normalizedHeading || headingLookup.has(normalizedHeading)) {
    return false;
  }

  const letters = value.match(/[A-Za-z]/g) ?? [];
  const uppercaseLetters = letters.filter((letter) =>
    /[A-Z]/.test(letter),
  ).length;
  const isMostlyUppercase =
    letters.length >= 2 && uppercaseLetters / letters.length >= 0.8;
  const words = value
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9&]+|[^A-Za-z0-9]+$/g, ""));
  const isTitleLike = words.every((word) => {
    if (!word) return true;
    if (TITLE_CONNECTORS.has(word.toLocaleLowerCase("en-US"))) return true;

    return /^[A-Z][A-Za-z0-9/&'+.-]*$/.test(word);
  });

  return isMostlyUppercase || isTitleLike;
}

export function parseResumeSections(text: string): ParsedResumeSectionsResult {
  const meaningfulLines = text
    .split(/\r?\n/)
    .map((line) => ({
      display: collapseWhitespace(line),
      normalized: normalizeResumeLine(line),
    }))
    .filter((line) => line.normalized.length > 0);
  const sections: ParsedResumeSection[] = [];
  const unknownHeadingCandidates: string[] = [];
  const unknownHeadingKeys = new Set<string>();

  let detectedHeadingCount = 0;
  let currentType: ResumeSectionType = "OTHER";
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  let currentStartLine = 0;
  let currentEndLine = 0;

  function closeCurrentSection(): void {
    if (currentLines.length === 0) {
      return;
    }

    sections.push({
      type: currentType,
      heading: currentHeading,
      lines: currentLines,
      startLine: currentStartLine,
      endLine: currentEndLine,
      source: "RULE",
      confidence:
        currentType === "OTHER"
          ? OTHER_SECTION_CONFIDENCE
          : RECOGNIZED_SECTION_CONFIDENCE,
    });
    currentLines = [];
    currentStartLine = 0;
    currentEndLine = 0;
  }

  meaningfulLines.forEach((line, index) => {
    // Positions are one-based within the normalized, non-empty line stream.
    const lineNumber = index + 1;
    const detectedType = detectSectionHeading(line.normalized);

    if (detectedType) {
      closeCurrentSection();
      detectedHeadingCount += 1;
      currentType = detectedType;
      currentHeading = line.display;
      return;
    }

    if (isPossibleUnknownHeading(line.display)) {
      const candidateKey = normalizeHeadingCandidate(line.display);

      if (candidateKey && !unknownHeadingKeys.has(candidateKey)) {
        unknownHeadingKeys.add(candidateKey);
        unknownHeadingCandidates.push(line.display);
      }
    }

    if (currentLines.length === 0) {
      currentStartLine = lineNumber;
    }

    currentLines.push(line.normalized);
    currentEndLine = lineNumber;
  });

  closeCurrentSection();

  const contentLineCount = sections.reduce(
    (count, section) => count + section.lines.length,
    0,
  );
  const otherLineCount = sections
    .filter((section) => section.type === "OTHER")
    .reduce((count, section) => count + section.lines.length, 0);
  const otherRatio =
    contentLineCount === 0 ? 0 : otherLineCount / contentLineCount;
  const warnings: string[] = [];

  if (detectedHeadingCount < 2) {
    warnings.push("Fewer than 2 recognized section headings were detected.");
  }

  const hasCoreSection = sections.some(
    (section) =>
      section.type === "EXPERIENCE" ||
      section.type === "EDUCATION" ||
      section.type === "SKILLS",
  );

  if (!hasCoreSection) {
    warnings.push(
      "No EXPERIENCE, EDUCATION, or SKILLS section was detected.",
    );
  }

  if (contentLineCount > 0 && otherRatio > OTHER_FALLBACK_RATIO) {
    warnings.push(
      "More than 60% of content lines were classified as OTHER.",
    );
  }

  if (contentLineCount === 0) {
    warnings.push("No resume content lines were found.");
  }

  return {
    sections,
    diagnostics: {
      lineCount: meaningfulLines.length,
      detectedHeadingCount,
      detectedSectionCount: sections.length,
      otherLineCount,
      otherRatio,
      unknownHeadingCandidates,
      warnings,
      requiresFallback: warnings.length > 0,
    },
  };
}
