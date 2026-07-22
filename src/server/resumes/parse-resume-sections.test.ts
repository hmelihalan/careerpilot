import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  detectSectionHeading,
  normalizeHeadingCandidate,
  normalizeResumeLine,
  parseResumeSections,
} from "./parse-resume-sections";

describe("resume section heading detection", () => {
  it("matches exact aliases case-insensitively", () => {
    expect(detectSectionHeading("professional summary")).toBe("SUMMARY");
    expect(detectSectionHeading("PrOfEsSiOnAl SuMmArY")).toBe("SUMMARY");
    expect(detectSectionHeading("employment history")).toBe("EXPERIENCE");
    expect(detectSectionHeading("core competencies")).toBe("SKILLS");
  });

  it("normalizes whitespace, dashes, and trailing heading punctuation", () => {
    expect(normalizeResumeLine("  Education   —  ")).toBe("Education -");
    expect(normalizeHeadingCandidate("WORK EXPERIENCE:")).toBe(
      "work experience",
    );
    expect(detectSectionHeading("WORK EXPERIENCE:")).toBe("EXPERIENCE");
    expect(detectSectionHeading("Education —")).toBe("EDUCATION");
    expect(detectSectionHeading("Technical Skills | ")).toBe("SKILLS");
  });

  it("rejects substring false positives", () => {
    const falsePositives = [
      "I have five years of experience",
      "Education technology specialist",
      "Skills include React and TypeScript",
      "Projects delivered for enterprise clients",
    ];

    for (const value of falsePositives) {
      expect(detectSectionHeading(value)).toBeNull();
    }
  });

  it("rejects empty, long, and overly wordy heading candidates", () => {
    expect(normalizeHeadingCandidate("   ")).toBeNull();
    expect(normalizeHeadingCandidate("A".repeat(61))).toBeNull();
    expect(
      normalizeHeadingCandidate("one two three four five six seven eight"),
    ).toBeNull();
  });
});

describe("parseResumeSections", () => {
  it("splits summary, experience, education, and skills in document order", () => {
    const result = parseResumeSections(`Summary
Product-minded software engineer.
Work Experience
Senior Engineer at Acme
Education
B.S. Computer Science
Skills
TypeScript, React, PostgreSQL`);

    expect(result.sections.map((section) => section.type)).toEqual([
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
    ]);
    expect(result.sections.map((section) => section.lines)).toEqual([
      ["Product-minded software engineer."],
      ["Senior Engineer at Acme"],
      ["B.S. Computer Science"],
      ["TypeScript, React, PostgreSQL"],
    ]);
    expect(result.sections.every((section) => section.confidence === 1)).toBe(
      true,
    );
    expect(result.diagnostics.requiresFallback).toBe(false);
  });

  it("stops the active section when the next heading is found", () => {
    const result = parseResumeSections(`Summary
First summary line
Second summary line
Projects
CareerPilot
Skills
TypeScript`);

    expect(result.sections[0]).toMatchObject({
      type: "SUMMARY",
      heading: "Summary",
      lines: ["First summary line", "Second summary line"],
      startLine: 2,
      endLine: 3,
    });
    expect(result.sections[1]).toMatchObject({
      type: "PROJECTS",
      heading: "Projects",
      lines: ["CareerPilot"],
      startLine: 5,
      endLine: 5,
    });
    expect(result.sections[2]).toMatchObject({
      type: "SKILLS",
      lines: ["TypeScript"],
    });
  });

  it("preserves repeated section types as separate sections", () => {
    const result = parseResumeSections(`Experience
Engineer at Acme
Professional Experience
Consultant at Example Co.
Education
B.S. Computer Science`);

    expect(result.sections.map((section) => section.type)).toEqual([
      "EXPERIENCE",
      "EXPERIENCE",
      "EDUCATION",
    ]);
    expect(result.sections[0]?.lines).toEqual(["Engineer at Acme"]);
    expect(result.sections[1]?.lines).toEqual(["Consultant at Example Co."]);
  });

  it("keeps content before the first heading under OTHER", () => {
    const result = parseResumeSections(`Jane Doe
jane@example.com
Professional Summary
Software engineer focused on reliable systems.`);

    expect(result.sections[0]).toEqual({
      type: "OTHER",
      heading: null,
      lines: ["Jane Doe", "jane@example.com"],
      startLine: 1,
      endLine: 2,
      source: "RULE",
      confidence: 0.5,
    });
    expect(result.sections[1]?.type).toBe("SUMMARY");
    expect(result.sections.some((section) => section.type === "CONTACT")).toBe(
      false,
    );
  });

  it("ignores empty lines and reports meaningful line positions", () => {
    const result = parseResumeSections(`

  Summary  

  Clear communicator.  

`);

    expect(result.diagnostics.lineCount).toBe(2);
    expect(result.sections).toEqual([
      {
        type: "SUMMARY",
        heading: "Summary",
        lines: ["Clear communicator."],
        startLine: 2,
        endLine: 2,
        source: "RULE",
        confidence: 1,
      },
    ]);
  });

  it("computes OTHER ratio from content lines only", () => {
    const result = parseResumeSections(`Jane Doe
jane@example.com
Summary
Platform engineer.
Skills
TypeScript`);

    expect(result.diagnostics.otherLineCount).toBe(2);
    expect(result.diagnostics.otherRatio).toBe(0.5);
  });

  it("requires fallback when too few headings are detected", () => {
    const result = parseResumeSections(`Summary
Platform engineer.`);

    expect(result.diagnostics.detectedHeadingCount).toBe(1);
    expect(result.diagnostics.requiresFallback).toBe(true);
    expect(result.diagnostics.warnings).toContain(
      "Fewer than 2 recognized section headings were detected.",
    );
    expect(result.diagnostics.warnings).toContain(
      "No EXPERIENCE, EDUCATION, or SKILLS section was detected.",
    );
  });

  it("reports unknown heading candidates without using them as boundaries", () => {
    const result = parseResumeSections(`Summary
Focused engineer.
Volunteer Experience
Led community events.
VOLUNTEER EXPERIENCE
Experience
Engineer at Acme`);

    expect(result.diagnostics.unknownHeadingCandidates).toEqual([
      "Volunteer Experience",
    ]);
    expect(result.sections.map((section) => section.type)).toEqual([
      "SUMMARY",
      "EXPERIENCE",
    ]);
    expect(result.sections[0]?.lines).toEqual([
      "Focused engineer.",
      "Volunteer Experience",
      "Led community events.",
      "VOLUNTEER EXPERIENCE",
    ]);
  });

  it("handles empty input safely", () => {
    const result = parseResumeSections(" \n\t\n");

    expect(result.sections).toEqual([]);
    expect(result.diagnostics).toMatchObject({
      lineCount: 0,
      detectedHeadingCount: 0,
      detectedSectionCount: 0,
      otherLineCount: 0,
      otherRatio: 0,
      unknownHeadingCandidates: [],
      requiresFallback: true,
    });
    expect(result.diagnostics.warnings).toContain(
      "No resume content lines were found.",
    );
  });

  it("parses representative text shaped like PDF extractor output", () => {
    const result = parseResumeSections(`Byungjin Park
DevOps Engineer · Software Architect
Professional Summary:
Seasoned SRE and DevOps leader focused on reliable cloud systems.
WORK EXPERIENCE:
Dunamu Inc. Seoul, S.Korea
DevOps Engineer Sep. 2023 - Mar. 2024
Education —
B.S. in Computer Science and Engineering
TECHNICAL SKILLS |
AWS, Kubernetes, Terraform, TypeScript`);

    expect(result.sections.map((section) => section.type)).toEqual([
      "OTHER",
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
    ]);
    expect(result.sections.map((section) => section.heading)).toEqual([
      null,
      "Professional Summary:",
      "WORK EXPERIENCE:",
      "Education —",
      "TECHNICAL SKILLS |",
    ]);
    expect(result.sections[2]?.lines).toEqual([
      "Dunamu Inc. Seoul, S.Korea",
      "DevOps Engineer Sep. 2023 - Mar. 2024",
    ]);
    expect(result.diagnostics).toMatchObject({
      lineCount: 11,
      detectedHeadingCount: 4,
      detectedSectionCount: 5,
      otherLineCount: 2,
      requiresFallback: false,
    });
  });
});
