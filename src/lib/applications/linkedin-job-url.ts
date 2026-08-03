export type LinkedInJobUrlDetails = {
  canonicalUrl: string;
  company: string;
  jobId: string | null;
  role: string;
};

function humanizeSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      if (["ai", "ui", "ux", "qa", "it"].includes(normalized)) {
        return normalized.toUpperCase();
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

export function parseLinkedInJobUrl(
  value: string,
): LinkedInJobUrlDetails | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com"))
  ) {
    return null;
  }

  const match = url.pathname.match(/^\/jobs\/view\/([^/]+)\/?$/i);
  if (!match) return null;

  let decodedSegment: string;
  try {
    decodedSegment = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  const jobIdMatch = decodedSegment.match(/(?:^|-)(\d{5,})$/);
  const jobId = jobIdMatch?.[1] ?? null;
  const slug = jobIdMatch
    ? decodedSegment.slice(0, -jobIdMatch[0].length)
    : decodedSegment;
  const separatorIndex = slug.lastIndexOf("-at-");
  const roleSlug = separatorIndex > 0 ? slug.slice(0, separatorIndex) : "";
  const companySlug = separatorIndex > 0 ? slug.slice(separatorIndex + 4) : "";
  const canonicalSegment = jobId ?? decodedSegment;

  return {
    canonicalUrl: `https://www.linkedin.com/jobs/view/${canonicalSegment}`,
    company: humanizeSlug(companySlug),
    jobId,
    role: humanizeSlug(roleSlug),
  };
}

export function isLinkedInJobUrl(value: string): boolean {
  return parseLinkedInJobUrl(value) !== null;
}
