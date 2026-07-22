import {
  createResumePdfLoadingTask,
  RESUME_OCR_CHARACTER_THRESHOLD,
} from "./load-pdf-document";
import type {
  ResumeDatasetLine,
  ResumeDatasetPage,
} from "./resume-dataset-schema";

export const MULTI_COLUMN_WARNING_PREFIX =
  "MULTI_COLUMN_OR_AMBIGUOUS_READING_ORDER";

export type ResumeTextFeatures = Pick<
  ResumeDatasetLine,
  | "wordCount"
  | "characterCount"
  | "uppercaseRatio"
  | "digitRatio"
  | "hasEmail"
  | "hasPhone"
  | "hasUrl"
  | "hasDate"
  | "hasDateRange"
  | "startsWithBullet"
>;

export type ResumePdfTextFragment = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string | null;
};

export type ReconstructedResumePage = {
  lines: ResumeDatasetLine[];
  warnings: string[];
  nextGlobalLineNumber: number;
};

export type ExtractedResumeLayout = {
  pageCount: number;
  characterCount: number;
  requiresOcr: boolean;
  warnings: string[];
  pages: ResumeDatasetPage[];
};

type PdfJsTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
};

type VerticalLineGroup = {
  referenceY: number;
  averageHeight: number;
  fragments: ResumePdfTextFragment[];
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_CANDIDATE_PATTERN =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{2,4}[\s.-]\d{3,4}/g;
const URL_PATTERN =
  /(?:https?:\/\/|www\.)\S+|\b(?:[a-z0-9-]+\.)+(?:ai|au|ca|co|com|de|dev|edu|fr|gov|io|me|net|org|uk)\b/i;
const MONTH_PATTERN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_PATTERN = new RegExp(
  `\\b(?:${MONTH_PATTERN}\\s+\\d{4}|\\d{1,2}[./-]\\d{1,2}[./-](?:\\d{2}|\\d{4})|\\d{1,2}[./-]\\d{4}|(?:19|20)\\d{2})\\b`,
  "i",
);
const DATE_RANGE_PATTERN = new RegExp(
  `(?:${MONTH_PATTERN}\\s+)?(?:19|20)\\d{2}\\s*(?:-|–|—|\\bto\\b)\\s*(?:(?:${MONTH_PATTERN}\\s+)?(?:19|20)\\d{2}|present|current)`,
  "i",
);
const BULLET_PATTERN = /^\s*(?:[•●▪◦‣∙*-]|\d+[.)])\s+/;

export function normalizeResumeDatasetText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function countResumeCharacters(value: string): number {
  return Array.from(value).filter((character) => !/\s/u.test(character)).length;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;

  return Math.min(1, Math.max(0, numerator / denominator));
}

export function extractResumeTextFeatures(text: string): ResumeTextFeatures {
  const visibleCharacters = Array.from(text).filter(
    (character) => !/\s/u.test(character),
  );
  const casedCharacters = visibleCharacters.filter((character) =>
    /\p{Lu}|\p{Ll}/u.test(character),
  );
  const uppercaseCharacters = casedCharacters.filter((character) =>
    /\p{Lu}/u.test(character),
  );
  const digitCharacters = visibleCharacters.filter((character) =>
    /\p{Nd}/u.test(character),
  );
  const phoneCandidates = text.match(PHONE_CANDIDATE_PATTERN) ?? [];
  const hasPhone = phoneCandidates.some((candidate) => {
    const digitCount = candidate.replace(/\D/g, "").length;
    return digitCount >= 9 && digitCount <= 15;
  });

  return {
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    characterCount: visibleCharacters.length,
    uppercaseRatio: ratio(
      uppercaseCharacters.length,
      casedCharacters.length,
    ),
    digitRatio: ratio(digitCharacters.length, visibleCharacters.length),
    hasEmail: EMAIL_PATTERN.test(text),
    hasPhone,
    hasUrl: URL_PATTERN.test(text),
    hasDate: DATE_PATTERN.test(text),
    hasDateRange: DATE_RANGE_PATTERN.test(text),
    startsWithBullet: BULLET_PATTERN.test(text),
  };
}

function isPdfJsTextItem(value: unknown): value is PdfJsTextItem {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.str === "string" &&
    Array.isArray(candidate.transform) &&
    candidate.transform.length >= 6 &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    (candidate.fontName === undefined || typeof candidate.fontName === "string")
  );
}

function toFiniteFragment(item: PdfJsTextItem): ResumePdfTextFragment | null {
  const text = normalizeResumeDatasetText(item.str);
  const x = item.transform[4];
  const y = item.transform[5];
  const transformHeight = Math.hypot(
    item.transform[2] ?? 0,
    item.transform[3] ?? 0,
  );
  const height = Math.abs(item.height) || transformHeight;
  const width = Math.abs(item.width);

  if (
    !text ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    text,
    x: x ?? 0,
    y: y ?? 0,
    width,
    height,
    fontName: item.fontName?.trim() || null,
  };
}

function isGeometryUsable(
  fragment: ResumePdfTextFragment,
  pageWidth: number,
  pageHeight: number,
): boolean {
  const horizontalTolerance = Math.max(1, pageWidth * 0.002);
  const verticalTolerance = Math.max(1, pageHeight * 0.002);

  return (
    fragment.x >= -horizontalTolerance &&
    fragment.y >= -verticalTolerance &&
    fragment.x + fragment.width <= pageWidth + horizontalTolerance &&
    fragment.y + fragment.height <= pageHeight + verticalTolerance
  );
}

function normalizedCoordinate(value: number, dimension: number): number {
  const normalized = value / dimension;
  const precisionTolerance = Math.max(1 / dimension, 0.002);

  if (
    !Number.isFinite(normalized) ||
    normalized < -precisionTolerance ||
    normalized > 1 + precisionTolerance
  ) {
    throw new Error("PDF text geometry exceeds page bounds.");
  }

  return Math.min(1, Math.max(0, normalized));
}

function shouldInsertSpace(
  previous: ResumePdfTextFragment,
  current: ResumePdfTextFragment,
): boolean {
  const gap = current.x - (previous.x + previous.width);
  if (gap <= 0) return false;

  const previousCharacterWidth =
    previous.width / Math.max(1, countResumeCharacters(previous.text));
  const currentCharacterWidth =
    current.width / Math.max(1, countResumeCharacters(current.text));
  const spacingThreshold = Math.max(
    0.75,
    Math.min(previousCharacterWidth, currentCharacterWidth) * 0.25,
  );

  if (gap < spacingThreshold) return false;
  if (/^[,.;:!?%)\]}]/.test(current.text)) return false;
  if (/[([{/]$/.test(previous.text)) return false;

  return true;
}

function joinFragmentText(fragments: ResumePdfTextFragment[]): string {
  return fragments.reduce((text, fragment, index) => {
    if (index === 0) return fragment.text;

    const previous = fragments[index - 1];
    const separator =
      previous && shouldInsertSpace(previous, fragment) ? " " : "";
    return `${text}${separator}${fragment.text}`;
  }, "");
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle] ?? null;

  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2;
}

function getFontMetadata(fragments: ResumePdfTextFragment[]): Pick<
  ResumeDatasetLine,
  "fontNames" | "dominantFontName" | "dominantFontHeight"
> {
  const fontContributions = new Map<string, number>();

  for (const fragment of fragments) {
    if (!fragment.fontName) continue;

    fontContributions.set(
      fragment.fontName,
      (fontContributions.get(fragment.fontName) ?? 0) +
        countResumeCharacters(fragment.text),
    );
  }

  const fontNames = [...fontContributions.keys()].sort((first, second) =>
    first.localeCompare(second),
  );
  const dominantFontName = fontNames
    .map((fontName) => ({
      fontName,
      contribution: fontContributions.get(fontName) ?? 0,
    }))
    .sort(
      (first, second) =>
        second.contribution - first.contribution ||
        first.fontName.localeCompare(second.fontName),
    )[0]?.fontName ?? null;
  const dominantFontHeight = dominantFontName
    ? median(
        fragments
          .filter((fragment) => fragment.fontName === dominantFontName)
          .map((fragment) => fragment.height),
      )
    : null;

  return { fontNames, dominantFontName, dominantFontHeight };
}

function createDatasetLine(
  fragments: ResumePdfTextFragment[],
  lineNumber: number,
  globalLineNumber: number,
  pageWidth: number,
  pageHeight: number,
): ResumeDatasetLine {
  const sortedFragments = [...fragments].sort(
    (first, second) => first.x - second.x,
  );
  const x = Math.min(...sortedFragments.map((fragment) => fragment.x));
  const y = Math.min(...sortedFragments.map((fragment) => fragment.y));
  const right = Math.max(
    ...sortedFragments.map((fragment) => fragment.x + fragment.width),
  );
  const top = Math.max(
    ...sortedFragments.map((fragment) => fragment.y + fragment.height),
  );
  const width = right - x;
  const height = top - y;
  const text = joinFragmentText(sortedFragments);

  return {
    lineNumber,
    globalLineNumber,
    text,
    x,
    // PDF.js text transforms use a bottom-left origin. This line y is the
    // minimum fragment baseline; height spans to the highest approximated top.
    y,
    width,
    height,
    normalizedX: normalizedCoordinate(x, pageWidth),
    normalizedY: normalizedCoordinate(y, pageHeight),
    normalizedWidth: normalizedCoordinate(width, pageWidth),
    normalizedHeight: normalizedCoordinate(height, pageHeight),
    ...extractResumeTextFeatures(text),
    textItemCount: sortedFragments.length,
    ...getFontMetadata(sortedFragments),
  };
}

export function reconstructResumeDatasetLines(
  inputFragments: readonly ResumePdfTextFragment[],
  pageWidth: number,
  pageHeight: number,
  pageNumber = 1,
  previousGlobalLineNumber = 0,
): ReconstructedResumePage {
  if (
    !Number.isFinite(pageWidth) ||
    !Number.isFinite(pageHeight) ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    throw new Error("PDF page dimensions must be finite positive numbers.");
  }

  const warnings = new Set<string>();
  const fragments = inputFragments
    .filter((fragment) => {
      const usable =
        Boolean(fragment.text) &&
        Number.isFinite(fragment.x) &&
        Number.isFinite(fragment.y) &&
        Number.isFinite(fragment.width) &&
        Number.isFinite(fragment.height) &&
        fragment.width >= 0 &&
        fragment.height > 0 &&
        isGeometryUsable(fragment, pageWidth, pageHeight);

      if (!usable) warnings.add(`INVALID_TEXT_GEOMETRY_PAGE_${pageNumber}`);
      return usable;
    })
    .map((fragment) => ({
      ...fragment,
      text: normalizeResumeDatasetText(fragment.text),
    }))
    .filter((fragment) => fragment.text.length > 0)
    .sort((first, second) => second.y - first.y || first.x - second.x);
  const verticalGroups: VerticalLineGroup[] = [];

  for (const fragment of fragments) {
    const group = verticalGroups.find((candidate) => {
      const tolerance = Math.max(
        1,
        Math.min(candidate.averageHeight, fragment.height) * 0.35,
      );
      return Math.abs(candidate.referenceY - fragment.y) <= tolerance;
    });

    if (!group) {
      verticalGroups.push({
        referenceY: fragment.y,
        averageHeight: fragment.height,
        fragments: [fragment],
      });
      continue;
    }

    const existingCount = group.fragments.length;
    group.referenceY =
      (group.referenceY * existingCount + fragment.y) / (existingCount + 1);
    group.averageHeight =
      (group.averageHeight * existingCount + fragment.height) /
      (existingCount + 1);
    group.fragments.push(fragment);
  }

  const splitGroups: ResumePdfTextFragment[][] = [];

  for (const group of verticalGroups.sort(
    (first, second) => second.referenceY - first.referenceY,
  )) {
    const sorted = [...group.fragments].sort(
      (first, second) => first.x - second.x,
    );
    let current: ResumePdfTextFragment[] = [];

    for (const fragment of sorted) {
      const previous = current[current.length - 1];
      const gap = previous
        ? fragment.x - (previous.x + previous.width)
        : 0;
      const largeGapThreshold = Math.max(
        pageWidth * 0.18,
        Math.max(previous?.height ?? 0, fragment.height) * 8,
      );

      if (previous && gap > largeGapThreshold) {
        splitGroups.push(current);
        current = [];
        warnings.add(`${MULTI_COLUMN_WARNING_PREFIX}_PAGE_${pageNumber}`);
      }

      current.push(fragment);
    }

    if (current.length > 0) splitGroups.push(current);
  }

  // Split groups use deterministic row-major ordering. A warning is emitted
  // whenever a page-scale gap makes true column reading order ambiguous.
  splitGroups.sort((first, second) => {
    const firstY = Math.min(...first.map((fragment) => fragment.y));
    const secondY = Math.min(...second.map((fragment) => fragment.y));
    if (firstY !== secondY) return secondY - firstY;

    return (
      Math.min(...first.map((fragment) => fragment.x)) -
      Math.min(...second.map((fragment) => fragment.x))
    );
  });

  const lines = splitGroups.map((group, index) =>
    createDatasetLine(
      group,
      index + 1,
      previousGlobalLineNumber + index + 1,
      pageWidth,
      pageHeight,
    ),
  );

  return {
    lines,
    warnings: [...warnings].sort(),
    nextGlobalLineNumber: previousGlobalLineNumber + lines.length,
  };
}

export async function extractResumeLayout(
  pdfBuffer: Uint8Array,
): Promise<ExtractedResumeLayout> {
  if (!(pdfBuffer instanceof Uint8Array)) {
    throw new TypeError("PDF input must be a Uint8Array.");
  }

  if (pdfBuffer.byteLength === 0) {
    throw new Error("PDF input is empty.");
  }

  const loadingTask = await createResumePdfLoadingTask(pdfBuffer);
  const document = await loadingTask.promise;

  try {
    const pages: ResumeDatasetPage[] = [];
    const warnings = new Set<string>();
    let globalLineNumber = 0;

    for (
      let pageNumber = 1;
      pageNumber <= document.numPages;
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const fragments = content.items.flatMap((item) => {
        if (!isPdfJsTextItem(item)) return [];

        const fragment = toFiniteFragment(item);
        return fragment ? [fragment] : [];
      });
      const reconstructed = reconstructResumeDatasetLines(
        fragments,
        viewport.width,
        viewport.height,
        pageNumber,
        globalLineNumber,
      );

      globalLineNumber = reconstructed.nextGlobalLineNumber;
      reconstructed.warnings.forEach((warning) => warnings.add(warning));
      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        lines: reconstructed.lines,
      });
    }

    const characterCount = pages.reduce(
      (total, page) =>
        total +
        page.lines.reduce((pageTotal, line) => pageTotal + line.characterCount, 0),
      0,
    );
    const requiresOcr = characterCount < RESUME_OCR_CHARACTER_THRESHOLD;

    if (requiresOcr) {
      warnings.add(
        `OCR_REQUIRED_FEWER_THAN_${RESUME_OCR_CHARACTER_THRESHOLD}_CHARACTERS`,
      );
    }

    return {
      pageCount: document.numPages,
      characterCount,
      requiresOcr,
      warnings: [...warnings].sort(),
      pages,
    };
  } finally {
    await loadingTask.destroy();
  }
}
