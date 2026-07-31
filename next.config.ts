import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/resume-builder/pdf": [
      "./node_modules/@fontsource/roboto/files/roboto-latin-ext-400-normal.woff",
      "./node_modules/@fontsource/roboto/files/roboto-latin-ext-700-normal.woff",
    ],
  },
};

export default nextConfig;
