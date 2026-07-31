import { describe, expect, it } from "vitest";

import {
  createEmptyResumeDocument,
  resumeDocumentSchema,
} from "./schema";

describe("resumeDocumentSchema", () => {
  it("accepts a valid empty draft", () => {
    expect(
      resumeDocumentSchema.safeParse(createEmptyResumeDocument()).success,
    ).toBe(true);
  });

  it("rejects unexpected fields", () => {
    const draft = { ...createEmptyResumeDocument(), ownerId: "another-user" };

    expect(resumeDocumentSchema.safeParse(draft).success).toBe(false);
  });

  it("limits collection sizes", () => {
    const draft = {
      ...createEmptyResumeDocument(),
      skills: Array.from({ length: 41 }, (_, index) => `Skill ${index}`),
    };

    expect(resumeDocumentSchema.safeParse(draft).success).toBe(false);
  });
});
