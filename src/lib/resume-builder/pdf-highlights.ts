import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";

export type PdfTextItem = {
  str: string;
};

export type PdfEvidenceMatch = {
  improvementIndex: number;
  itemIndexes: number[];
  priority: ResumeAnalysis["improvements"][number]["priority"];
  issue: string;
  score: number;
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "bir",
  "ile",
  "için",
  "olan",
  "olarak",
  "ve",
]);

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function meaningfulWords(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreWindow(source: string, evidence: string): number {
  const normalizedSource = normalize(source);
  const normalizedEvidence = normalize(evidence);
  if (!normalizedEvidence) return 0;
  if (normalizedSource.includes(normalizedEvidence)) return 2;

  const evidenceWords = [...new Set(meaningfulWords(evidence))];
  if (!evidenceWords.length) return 0;
  const sourceWords = new Set(meaningfulWords(source));
  const matched = evidenceWords.filter((word) => sourceWords.has(word)).length;
  const coverage = matched / evidenceWords.length;

  if (matched < Math.min(2, evidenceWords.length) || coverage < 0.5) return 0;
  return coverage + Math.min(matched / 10, 0.35);
}

export function matchEvidenceAcrossPages(
  pages: PdfTextItem[][],
  improvements: ResumeAnalysis["improvements"],
): PdfEvidenceMatch[][] {
  const matches = pages.map(() => [] as PdfEvidenceMatch[]);

  improvements.forEach((improvement, improvementIndex) => {
    let best:
      | {
          pageIndex: number;
          start: number;
          end: number;
          score: number;
        }
      | undefined;

    pages.forEach((items, pageIndex) => {
      items.forEach((_, start) => {
        let source = "";
        for (let end = start; end < Math.min(items.length, start + 14); end += 1) {
          source += ` ${items[end].str}`;
          if (meaningfulWords(source).length > 45) break;
          const score = scoreWindow(source, improvement.evidence);
          if (score > (best?.score ?? 0)) {
            best = { pageIndex, start, end, score };
          }
        }
      });
    });

    const found = best;
    if (found) {
      matches[found.pageIndex].push({
        improvementIndex,
        itemIndexes: Array.from(
          { length: found.end - found.start + 1 },
          (_, offset) => found.start + offset,
        ),
        priority: improvement.priority,
        issue: improvement.issue,
        score: found.score,
      });
    }
  });

  return matches;
}
