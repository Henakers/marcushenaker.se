import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

const serverJs = path.resolve(".next/standalone/server.js");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilUp(url: string, server: ChildProcess, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Standalone server exited early with code ${server.exitCode}`);
    }
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Standalone server did not answer at ${url} within ${timeoutMs} ms`);
}

/** Starts the standalone server from `next build` on a free port and shares its URL with the tests. */
export default async function setup(project: TestProject) {
  if (!fs.existsSync(serverJs)) {
    const message = `${serverJs} not found. Run \`pnpm build\` before \`pnpm test:e2e\`.`;
    // Logged as well as thrown: Vitest can fail to print errors thrown from a global setup.
    console.error(message);
    throw new Error(message);
  }

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [serverJs], {
    env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "inherit", "inherit"],
  });

  await waitUntilUp(baseUrl, server);
  project.provide("baseUrl", baseUrl);

  return () => {
    server.kill();
  };
}
