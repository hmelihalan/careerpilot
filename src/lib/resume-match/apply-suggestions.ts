import type {
  ResumeMatchResult,
  ResumeMatchSuggestion,
} from "./schema";
import type { ResumeDocument } from "../resume-builder/schema";

export type TailoredResumeChange = {
  index: number;
  section: "summary" | "experience" | "skills";
  experienceId: string | null;
  bulletIndex: number | null;
  before: string;
  after: string;
  title: string;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function applySuggestion(
  draft: ResumeDocument,
  suggestion: ResumeMatchSuggestion,
): ResumeDocument | null {
  if (suggestion.targetType === "summary") {
    if (normalize(draft.summary) !== normalize(suggestion.before)) return null;
    return { ...draft, summary: suggestion.after };
  }

  if (suggestion.targetType === "experience_bullet") {
    const experience = draft.experience.find(
      (item) => item.id === suggestion.experienceId,
    );
    if (!experience || suggestion.bulletIndex < 0) return null;
    const currentBullet = experience.bullets[suggestion.bulletIndex];
    if (!currentBullet || normalize(currentBullet) !== normalize(suggestion.before)) {
      return null;
    }

    return {
      ...draft,
      experience: draft.experience.map((item) => {
        if (item.id !== experience.id) return item;
        const bullets = [...item.bullets];
        bullets[suggestion.bulletIndex] = suggestion.after;
        return { ...item, bullets };
      }),
    };
  }

  const skill = suggestion.after.trim();
  if (!skill || draft.skills.some((item) => normalize(item) === normalize(skill))) {
    return null;
  }

  const resumeEvidence = JSON.stringify(draft).toLocaleLowerCase("en-US");
  if (!resumeEvidence.includes(skill.toLocaleLowerCase("en-US"))) return null;

  return { ...draft, skills: [...draft.skills, skill].slice(0, 40) };
}

export function applyAcceptedResumeMatchSuggestions(
  source: ResumeDocument,
  match: ResumeMatchResult,
  acceptedIndexes: readonly number[],
): { draft: ResumeDocument; changes: TailoredResumeChange[] } {
  let draft = structuredClone(source);
  const changes: TailoredResumeChange[] = [];

  for (const index of [...new Set(acceptedIndexes)].sort((a, b) => a - b)) {
    const suggestion = match.suggestions[index];
    if (!suggestion) continue;
    const next = applySuggestion(draft, suggestion);
    if (!next) continue;
    draft = next;
    changes.push({
      index,
      section: suggestion.category,
      experienceId:
        suggestion.targetType === "experience_bullet"
          ? suggestion.experienceId
          : null,
      bulletIndex:
        suggestion.targetType === "experience_bullet"
          ? suggestion.bulletIndex
          : null,
      before: suggestion.before,
      after: suggestion.after,
      title: suggestion.title,
    });
  }

  return { draft, changes };
}
