import "server-only";

import {
  createResumePdfLoadingTask,
  RESUME_OCR_CHARACTER_THRESHOLD,
} from "./load-pdf-document";

export type ExtractedResumePage = {
  pageNumber: number;
  text: string;
  characterCount: number;
};

export type ExtractedResumeDocument = {
  pageCount: number;
  text: string;
  pages: ExtractedResumePage[];
  characterCount: number;
  requiresOcr: boolean;
};

type PositionedTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};



function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const candidate = item as Record<string, unknown>;

  return (
    typeof candidate.str === "string" &&
    Array.isArray(candidate.transform) &&
    candidate.transform.length >= 6 &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}

function reconstructLines(
  items: PositionedTextItem[],
  yTolerance = 2,
): string[] {
  const sortedItems = items
    .filter((item) => normalizeWhitespace(item.text).length > 0)
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) <= yTolerance) {
        return a.x - b.x;
      }

      return b.y - a.y;
    });

  const lines: Array<{
    y: number;
    items: PositionedTextItem[];
  }> = [];

  for (const item of sortedItems) {
    const existingLine = lines.find(
      (line) => Math.abs(line.y - item.y) <= yTolerance,
    );

    if (existingLine) {
      existingLine.items.push(item);
      continue;
    }

    lines.push({
      y: item.y,
      items: [item],
    });
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => normalizeWhitespace(item.text))
        .filter(Boolean)
        .join(" "),
    )
    .map(normalizeWhitespace)
    .filter(Boolean);
}

export async function extractResumeText(
  pdfBuffer: Uint8Array,
): Promise<ExtractedResumeDocument> {
  if (!(pdfBuffer instanceof Uint8Array)) {
    throw new TypeError("PDF input must be a Uint8Array.");
  }

  if (pdfBuffer.byteLength === 0) {
    throw new Error("PDF input is empty.");
  }

  const loadingTask = await createResumePdfLoadingTask(pdfBuffer);

  const document = await loadingTask.promise;

  try {
    const pages: ExtractedResumePage[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= document.numPages;
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      const positionedItems: PositionedTextItem[] = content.items.flatMap(
        (item) => {
          if (!isPdfTextItem(item)) {
            return [];
          }

          return [
            {
              text: item.str,
              x: item.transform[4] ?? 0,
              y: item.transform[5] ?? 0,
              width: item.width,
              height: item.height,
            },
          ];
        },
      );

      const pageText = reconstructLines(positionedItems)
        .join("\n")
        .trim();

      pages.push({
        pageNumber,
        text: pageText,
        characterCount: pageText.replace(/\s/g, "").length,
      });
    }

    const text = pages
      .map((page) => page.text)
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const characterCount = text.replace(/\s/g, "").length;

    return {
      pageCount: document.numPages,
      text,
      pages,
      characterCount,
      requiresOcr: characterCount < RESUME_OCR_CHARACTER_THRESHOLD,
    };
  } finally {
    await loadingTask.destroy();
  }
}
