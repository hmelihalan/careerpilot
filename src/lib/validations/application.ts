import type {
  ApplicationFieldErrors,
  ApplicationFormData,
  ApplicationImportMethod,
} from "@/src/types/application";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateImportInput(
  method: ApplicationImportMethod,
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return method === "description"
      ? "Enter a job description to analyze."
      : "Enter a job URL to continue.";
  }

  if (method === "description" && normalizedValue.length < 100) {
    return "Job description must be at least 100 characters. Add more details from the listing.";
  }

  if (method === "url" && !isValidHttpUrl(normalizedValue)) {
    return "Enter a valid URL beginning with http:// or https://.";
  }

  return undefined;
}

export function validateApplication(
  application: ApplicationFormData,
): ApplicationFieldErrors {
  const errors: ApplicationFieldErrors = {};

  if (!application.company.trim()) {
    errors.company = "Company is required.";
  }

  if (!application.role.trim()) {
    errors.role = "Role is required.";
  }

  if (
    application.applicationUrl.trim() &&
    !isValidHttpUrl(application.applicationUrl.trim())
  ) {
    errors.applicationUrl =
      "Enter a valid URL beginning with http:// or https://.";
  }

  return errors;
}
