import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";

type Improvement = ResumeAnalysis["improvements"][number];

export type AppliedResumeImprovement = {
  draft: ResumeDocument;
  section: "summary" | "experience" | "education";
  before: string;
  after: string;
};

function words(value: string): string[] {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function overlapScore(source: string, evidence: string): number {
  const sourceWords = new Set(words(source));
  const evidenceWords = words(evidence);
  if (!evidenceWords.length) return 0;
  return evidenceWords.filter((word) => sourceWords.has(word)).length;
}

function bestMatchIndex(values: string[], evidence: string): number {
  const scores = values.map((value) => overlapScore(value, evidence));
  const best = Math.max(...scores, 0);
  return best >= 2 ? scores.indexOf(best) : -1;
}

export function previewResumeImprovement(
  draft: ResumeDocument,
  improvement: Improvement,
): AppliedResumeImprovement | null {
  const example = improvement.example.trim();
  if (!example) return null;

  const summarySignal = `${improvement.issue} ${improvement.recommendation}`;
  const summaryMatches = overlapScore(draft.summary, improvement.evidence) >= 2;
  const namesSummary = /summary|profile|objective|özet|profil/i.test(summarySignal);

  if (
    draft.summary &&
    (summaryMatches ||
      (namesSummary &&
        ["clarity", "impact", "language", "structure"].includes(
          improvement.category,
        )))
  ) {
    return {
      draft: { ...draft, summary: example },
      section: "summary",
      before: draft.summary,
      after: example,
    };
  }

  if (
    improvement.category === "experience" ||
    ["clarity", "impact", "language"].includes(improvement.category)
  ) {
    const experienceIndex = bestMatchIndex(
      draft.experience.map((item) =>
        [item.role, item.company, ...item.bullets].join(" "),
      ),
      improvement.evidence,
    );
    const resolvedIndex =
      experienceIndex >= 0
        ? experienceIndex
        : improvement.category === "experience" && draft.experience.length === 1
          ? 0
          : -1;

    if (resolvedIndex >= 0) {
      const experience = draft.experience[resolvedIndex];
      const bulletIndex = bestMatchIndex(
        experience.bullets,
        improvement.evidence,
      );
      const bullets = [...experience.bullets];
      const before = bulletIndex >= 0 ? bullets[bulletIndex] : "New bullet";
      if (bulletIndex >= 0) bullets[bulletIndex] = example;
      else bullets.push(example);

      return {
        draft: {
          ...draft,
          experience: draft.experience.map((item, index) =>
            index === resolvedIndex ? { ...item, bullets: bullets.slice(0, 8) } : item,
          ),
        },
        section: "experience",
        before,
        after: example,
      };
    }
  }

  if (improvement.category === "education") {
    const educationIndex = bestMatchIndex(
      draft.education.map((item) =>
        [item.school, item.degree, item.details].join(" "),
      ),
      improvement.evidence,
    );
    const resolvedIndex =
      educationIndex >= 0
        ? educationIndex
        : draft.education.length === 1
          ? 0
          : -1;
    if (resolvedIndex >= 0) {
      const education = draft.education[resolvedIndex];
      return {
        draft: {
          ...draft,
          education: draft.education.map((item, index) =>
            index === resolvedIndex ? { ...item, details: example } : item,
          ),
        },
        section: "education",
        before: education.details || improvement.evidence,
        after: example,
      };
    }
  }

  return null;
}
