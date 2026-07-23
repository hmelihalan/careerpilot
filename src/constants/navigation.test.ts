import { describe, expect, it } from "vitest";

import { appNavigation } from "./navigation";

describe("appNavigation", () => {
  it("keeps authenticated links on authenticated route prefixes", () => {
    expect(appNavigation.authenticated.map((item) => item.href)).toEqual([
      "/dashboard",
      "/applications",
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
});
