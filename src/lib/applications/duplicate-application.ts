import {
  normalizeApplicationText,
  normalizeApplicationUrl,
} from "./normalize-application";

export type DuplicateApplicationInput = {
  company: string;
  role: string;
  location?: string | null;
  applicationUrl?: string | null;
};

export type DuplicateApplicationCandidate = {
  company: string;
  role: string;
  location: string | null;
  applicationUrl?: string | null;
};

export function findDuplicateByUrl<T extends DuplicateApplicationCandidate>(
  input: DuplicateApplicationInput,
  candidates: readonly T[],
): T | null {
  if (!input.applicationUrl) return null;

  const normalizedUrl = normalizeApplicationUrl(input.applicationUrl);
  if (!normalizedUrl) return null;

  return (
    candidates.find(
      (candidate) =>
        candidate.applicationUrl !== null &&
        candidate.applicationUrl !== undefined &&
        normalizeApplicationUrl(candidate.applicationUrl) === normalizedUrl,
    ) ?? null
  );
}

export function findDuplicateByFields<T extends DuplicateApplicationCandidate>(
  input: DuplicateApplicationInput,
  candidates: readonly T[],
): T | null {
  const company = normalizeApplicationText(input.company);
  const role = normalizeApplicationText(input.role);
  const location = normalizeApplicationText(input.location ?? "");

  if (!company || !role || !location) return null;

  return (
    candidates.find(
      (candidate) =>
        candidate.location !== null &&
        normalizeApplicationText(candidate.company) === company &&
        normalizeApplicationText(candidate.role) === role &&
        normalizeApplicationText(candidate.location) === location,
    ) ?? null
  );
}
