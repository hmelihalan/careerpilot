import { describe, expect, it } from "vitest";

import { extractResumeText, ResumeFileError } from "./extract-resume-text";

const readableResume = `
Jordan Lee
jordan@example.com

Summary
Backend engineer focused on TypeScript services and PostgreSQL.

Experience
Software Engineer at Acme
Built and maintained customer onboarding APIs.
`.repeat(2);

describe("extractResumeText", () => {
  it("normalizes a plain text resume without changing its content", async () => {
    const file = new File([readableResume.replace(/\n/g, "\r\n")], "resume.txt", {
      type: "text/plain",
    });

    const result = await extractResumeText(file);

    expect(result).toContain("Jordan Lee\njordan@example.com");
    expect(result).not.toContain("\r");
  });

  it("rejects unsupported file formats", async () => {
    const file = new File(["not a resume"], "resume.html", {
      type: "text/html",
    });

    await expect(extractResumeText(file)).rejects.toMatchObject<
      Partial<ResumeFileError>
    >({
      code: "unsupported_type",
    });
  });

  it("rejects files without enough readable text", async () => {
    const file = new File(["Jordan Lee"], "resume.txt", {
      type: "text/plain",
    });

    await expect(extractResumeText(file)).rejects.toMatchObject<
      Partial<ResumeFileError>
    >({
      code: "insufficient_text",
    });
  });

  it("checks PDF magic bytes instead of trusting the extension", async () => {
    const file = new File(["not actually a pdf"], "resume.pdf", {
      type: "application/pdf",
    });

    await expect(extractResumeText(file)).rejects.toMatchObject<
      Partial<ResumeFileError>
    >({
      code: "invalid_pdf",
    });
  });
});
