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

function createTextPdf(text: string): Uint8Array {
  const escapedText = text
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
  const stream = `BT
/F1 5 Tf
72 720 Td
(${escapedText}) Tj
ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>
stream
${stream}
endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj
${object}
endobj
`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f\r\n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return new TextEncoder().encode(pdf);
}

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

  it("keeps uploads below the Vercel request payload limit", async () => {
    const file = new File(
      [new Uint8Array(4 * 1024 * 1024 + 1)],
      "resume.txt",
      { type: "text/plain" },
    );

    await expect(extractResumeText(file)).rejects.toMatchObject<
      Partial<ResumeFileError>
    >({
      code: "file_too_large",
      message: "Resume files must be smaller than 4 MB.",
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

  it("extracts readable text from a valid PDF", async () => {
    const file = new File(
      [createTextPdf(readableResume.replace(/\s+/g, " "))],
      "resume.pdf",
      { type: "application/pdf" },
    );

    const result = await extractResumeText(file);

    expect(result).toContain("Jordan Lee");
    expect(result).toContain("Backend engineer");
    expect(result.length).toBeGreaterThan(120);
  });
});
