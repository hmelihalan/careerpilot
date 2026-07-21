import { describe, expect, it } from "vitest";

import {
  findDuplicateByFields,
  findDuplicateByUrl,
} from "./duplicate-application";
import {
  normalizeApplicationText,
  normalizeApplicationUrl,
} from "./normalize-application";

const candidate = {
  id: "application-1",
  company: "Acme Corporation",
  role: "Software Engineer",
  location: "New York, NY",
  applicationUrl: "https://jobs.example.com/openings/123",
};

describe("application normalization", () => {
  it("trims, collapses whitespace, and ignores text case", () => {
    expect(normalizeApplicationText("  Acme\n\t CORPORATION  ")).toBe(
      "acme corporation",
    );
  });

  it("removes trailing slashes, hashes, and known UTM parameters", () => {
    expect(
      normalizeApplicationUrl(
        " https://jobs.example.com/openings/123///?job=456&utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_term=engineer&utm_content=hero#apply ",
      ),
    ).toBe("https://jobs.example.com/openings/123?job=456");
  });
});

describe("duplicate application decisions", () => {
  it("matches normalized URLs", () => {
    expect(
      findDuplicateByUrl(
        {
          company: "Different company",
          role: "Different role",
          applicationUrl:
            "https://jobs.example.com/openings/123/?utm_source=linkedin#details",
        },
        [candidate],
      ),
    ).toBe(candidate);
  });

  it("requires normalized company, role, and location to all match", () => {
    expect(
      findDuplicateByFields(
        {
          company: " acme   corporation ",
          role: "SOFTWARE engineer",
          location: " new york, ny ",
        },
        [candidate],
      ),
    ).toBe(candidate);

    expect(
      findDuplicateByFields(
        {
          company: "Acme Corporation",
          role: "Product Manager",
          location: "New York, NY",
        },
        [candidate],
      ),
    ).toBeNull();
  });

  it.each([
    { company: "", role: "Software Engineer", location: "New York, NY" },
    { company: "Acme", role: "  ", location: "New York, NY" },
    { company: "Acme", role: "Software Engineer", location: "" },
    { company: "Acme", role: "Software Engineer" },
  ])("skips field matching when any required field is empty", (input) => {
    expect(findDuplicateByFields(input, [candidate])).toBeNull();
  });
});
