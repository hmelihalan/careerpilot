import { describe, expect, it } from "vitest";

import { appNavigation, isAppNavigationItemActive } from "./navigation";

describe("appNavigation", () => {
  it("keeps authenticated links on authenticated route prefixes", () => {
    expect(appNavigation.authenticated.map((item) => item.href)).toEqual([
      "/dashboard",
      "/applications",
      "/resumes",
      "/ai-studio",
      "/analytics",
      "/settings",
    ]);
  });

  it("keeps enabled demo links under the demo prefix", () => {
    const demoLinks = appNavigation.demo.flatMap((item) =>
      item.href ? [item.href] : [],
    );

    expect(demoLinks).toEqual(["/demo", "/demo/applications"]);
    expect(
      demoLinks.every((href) => href === "/demo" || href.startsWith("/demo/")),
    ).toBe(true);
  });

  it("keeps My Resumes active while editing a selected resume", () => {
    expect(
      isAppNavigationItemActive(
        "/resume-builder",
        "/resumes",
        "/dashboard",
        ["/resume-builder"],
      ),
    ).toBe(true);
  });
});
