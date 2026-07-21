import "server-only";

const trackingParameters = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export function normalizeApplicationText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeApplicationUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    url.hash = "";

    trackingParameters.forEach((parameter) => {
      url.searchParams.delete(parameter);
    });

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/g, "");
    }

    return url.toString();
  } catch {
    return null;
  }
}
