import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          // Seam 1: the content module, tested against fixture content directories.
          name: "content",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          // The banned-words guard, run as a CLI against throwaway git repos.
          name: "scripts",
          include: ["scripts/**/*.test.ts"],
          environment: "node",
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          // Seam 2: the built site over HTTP. Needs `pnpm build` first.
          name: "site",
          include: ["tests/site/**/*.test.ts"],
          globalSetup: ["tests/site/global-setup.ts"],
          environment: "node",
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
