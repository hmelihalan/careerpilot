import { describe, expect, it } from "vitest";

import { importedResumeSchema, toResumeDocument } from "./import-schema";

const importedResume = importedResumeSchema.parse({
  language: "tr",
  contact: {
    fullName: "Ada Lovelace",
    headline: "Yazılım Geliştirici",
    email: "ada@example.com",
    phone: "",
    location: "İstanbul",
    website: "",
    linkedin: "",
  },
  summary: "Ürün geliştirme deneyimi.",
  experience: [],
  education: [],
  skills: ["TypeScript"],
  projects: [],
  certifications: [],
});

describe("toResumeDocument", () => {
  it("creates a valid builder document from parsed resume content", () => {
    const draft = toResumeDocument(importedResume, "ada-cv.pdf");

    expect(draft.title).toBe("ada-cv");
    expect(draft.language).toBe("tr");
    expect(draft.contact.fullName).toBe("Ada Lovelace");
  });
});
