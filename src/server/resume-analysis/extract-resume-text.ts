import { PDFParse } from "pdf-parse";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MIN_READABLE_TEXT_LENGTH = 120;

export type ResumeFileErrorCode =
  | "file_too_large"
  | "insufficient_text"
  | "invalid_pdf"
  | "unsupported_type";

export class ResumeFileError extends Error {
  constructor(
    message: string,
    readonly code: ResumeFileErrorCode,
  ) {
    super(message);
    this.name = "ResumeFileError";
  }
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function isPlainTextFile(file: File): boolean {
  return (
    file.type === "text/plain" ||
    file.name.toLocaleLowerCase("en-US").endsWith(".txt")
  );
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLocaleLowerCase("en-US").endsWith(".pdf")
  );
}

async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") {
    throw new ResumeFileError(
      "The selected file is not a valid PDF.",
      "invalid_pdf",
    );
  }

  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text;
  } catch {
    throw new ResumeFileError(
      "The PDF could not be read. Try exporting it again or upload a text file.",
      "invalid_pdf",
    );
  } finally {
    await parser.destroy();
  }
}

export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ResumeFileError(
      "Resume files must be smaller than 8 MB.",
      "file_too_large",
    );
  }

  let extractedText: string;
  if (isPdfFile(file)) {
    extractedText = await extractPdfText(file);
  } else if (isPlainTextFile(file)) {
    extractedText = await file.text();
  } else {
    throw new ResumeFileError(
      "Upload a PDF or plain text resume.",
      "unsupported_type",
    );
  }

  const normalizedText = normalizeExtractedText(extractedText);
  if (normalizedText.length < MIN_READABLE_TEXT_LENGTH) {
    throw new ResumeFileError(
      "This file does not contain enough readable text. Scanned PDFs need OCR before analysis.",
      "insufficient_text",
    );
  }

  return normalizedText;
}
