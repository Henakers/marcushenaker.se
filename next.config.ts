import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname);

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the project root so Next.js never picks up a lockfile from a parent directory.
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
