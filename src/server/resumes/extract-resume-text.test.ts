import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractResumeText } from "./extract-resume-text";

describe("extractResumeText", () => {
  it("extracts text from a text-based resume PDF", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "resumes",
      "exres_1.pdf",
    );

    const file = await readFile(fixturePath);
    const result = await extractResumeText(new Uint8Array(file));

    console.log(result.text);

    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.characterCount).toBeGreaterThan(0);
    expect(result.pages).toHaveLength(result.pageCount);
    expect(result.text).toContain("Byungjin Park");
    expect(result.requiresOcr).toBe(false);
  });

  it("rejects an empty input", async () => {
    await expect(
      extractResumeText(new Uint8Array()),
    ).rejects.toThrow("PDF input is empty");
  });
});
