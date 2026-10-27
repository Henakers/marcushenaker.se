import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./deploy.sh", import.meta.url));

/** Bash on PATH, or Git Bash on Windows, where `bash` may be missing or be WSL's. */
function findBash(): string | undefined {
  const candidates =
    process.platform === "win32"
      ? [join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin", "bash.exe"), "bash"]
      : ["bash"];
  return candidates.find((candidate) => {
    if (candidate.includes("\\") && !existsSync(candidate)) return false;
    return spawnSync(candidate, ["-c", "true"]).status === 0;
  });
}

const bash = findBash();

const IMAGE = "ghcr.io/henakers/portfolio";
const OLD = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const NEW = "sha256:2222222222222222222222222222222222222222222222222222222222222222";

/**
 * A fake `docker` CLI. It keeps the running digest, the local `:main` digest and the
 * registry's `:main` digest as files in $FAKE_STATE, logs every call, and fails
 * `compose up` for any digest listed in $FAKE_STATE/broken. `compose up` hangs for any
 * digest listed in $FAKE_STATE/hanging.
 */
const fakeDocker = `#!/usr/bin/env bash
set -euo pipefail
state="$FAKE_STATE"
printf '%s\\n' "$*" >> "$state/docker-calls"
read_state() { if [[ -f "$state/$1" ]]; then cat "$state/$1"; fi; }
last="\${*: -1}"
case "$*" in
  "compose config --images web")
    echo "${IMAGE}:main" ;;
  "compose ps -q web")
    if [[ -n "$(read_state running)" ]]; then echo container-1; fi ;;
  "inspect --format {{.Image}} container-1")
    echo "image-id-of-$(read_state running)" ;;
  "image inspect --format "*)
    case "$last" in
      image-id-of-*) digest="\${last#image-id-of-}" ;;
      "${IMAGE}:main") digest="$(read_state local)" ;;
      *) echo "No such image: $last" >&2; exit 1 ;;
    esac
    if [[ -z "$digest" ]]; then echo "No such image: $last" >&2; exit 1; fi
    echo "${IMAGE}@$digest" ;;
  "compose pull --quiet web")
    read_state remote > "$state/local" ;;
  "buildx imagetools inspect "*)
    read_state remote ;;
  "compose up "*)
    tag="\${IMAGE_TAG:-main}"
    if [[ "$tag" == *@* ]]; then digest="\${tag#*@}"; else digest="$(read_state local)"; fi
    printf '%s\\n' "$digest" >> "$state/up-digests"
    if grep -qxF "$digest" "$state/broken" 2>/dev/null; then
      echo "container web is unhealthy" >&2
      exit 1
    fi
    if grep -qxF "$digest" "$state/hanging" 2>/dev/null; then exec sleep 60; fi
    printf '%s' "$digest" > "$state/running" ;;
  *)
    echo "fake docker: unexpected call: $*" >&2
    exit 99 ;;
esac
`;

/** A fake `curl` that records each ntfy push instead of sending it. */
const fakeCurl = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_STATE/curl-calls"
`;

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway server: fake `docker` and `curl` on PATH, a compose dir and a state dir. */
function createServer(initial: {
  running?: string;
  remote: string;
  broken?: string[];
  hanging?: string[];
  waitTimeout?: number;
}) {
  const root = mkdtempSync(join(tmpdir(), "portfolio-deploy-"));
  dirs.push(root);
  const bin = join(root, "bin");
  const fake = join(root, "fake");
  const composeDir = join(root, "compose");
  const stateDir = join(root, "state");
  for (const dir of [bin, fake, composeDir]) mkdirSync(dir);
  writeFileSync(join(bin, "docker"), fakeDocker, { mode: 0o755 });
  writeFileSync(join(bin, "curl"), fakeCurl, { mode: 0o755 });
  if (initial.running) {
    writeFileSync(join(fake, "running"), initial.running);
    writeFileSync(join(fake, "local"), initial.running);
  }
  writeFileSync(join(fake, "remote"), initial.remote);
  writeFileSync(join(fake, "broken"), (initial.broken ?? []).join("\n") + "\n");
  writeFileSync(join(fake, "hanging"), (initial.hanging ?? []).join("\n") + "\n");

  const read = (name: string) => {
    const file = join(fake, name);
    return existsSync(file) ? readFileSync(file, "utf8") : "";
  };
  const lines = (name: string) => read(name).split("\n").filter(Boolean);

  return {
    stateDir,
    run(...args: string[]) {
      // Put the fakes first on PATH from inside bash: Git Bash's launcher on Windows
      // prepends its own directories (which hold a real curl) to whatever PATH it gets.
      const withFakes =
        'export PATH="$(cygpath -u "$FAKE_BIN" 2>/dev/null || printf %s "$FAKE_BIN"):$PATH"; exec bash "$@"';
      const result = spawnSync(bash!, ["-c", withFakes, "bash", script, ...args], {
        env: {
          ...process.env,
          FAKE_BIN: bin,
          FAKE_STATE: fake,
          COMPOSE_DIR: composeDir,
          STATE_DIR: stateDir,
          NTFY_URL: "https://ntfy.example/portfolio-test",
          ...(initial.waitTimeout ? { WAIT_TIMEOUT: String(initial.waitTimeout) } : {}),
        },
        encoding: "utf8",
      });
      return { status: result.status, output: `${result.stdout}${result.stderr}` };
    },
    running: () => read("running").trim(),
    localDigest: () => read("local").trim(),
    dockerCalls: () => lines("docker-calls"),
    upDigests: () => lines("up-digests"),
    pushes: () => lines("curl-calls"),
    setRemote: (digest: string) => writeFileSync(join(fake, "remote"), digest),
  };
}

describe.skipIf(!bash)("deploy.sh", () => {
  it("does nothing when the pulled digest is already running", () => {
    const server = createServer({ running: OLD, remote: OLD });

    const result = server.run();

    expect(result.status).toBe(0);
    expect(server.upDigests()).toEqual([]);
    expect(server.pushes()).toEqual([]);
  });

  it("recreates the container with the new image when the digest changed", () => {
    const server = createServer({ running: OLD, remote: NEW });

    const result = server.run();

    expect(result.status).toBe(0);
    expect(server.running()).toBe(NEW);
    expect(server.dockerCalls()).toContain("compose up --detach --wait --wait-timeout 60 web");
    expect(server.pushes()).toEqual([]);
  });

  it("rolls back to the previous digest, pushes a notification and fails when the new image is unhealthy", () => {
    const server = createServer({ running: OLD, remote: NEW, broken: [NEW] });

    const result = server.run();

    expect(result.status).not.toBe(0);
    expect(server.upDigests()).toEqual([NEW, OLD]);
    expect(server.running()).toBe(OLD);
    expect(server.dockerCalls()).toContain("compose up --detach --wait --wait-timeout 60 web");
    expect(server.pushes()).toHaveLength(1);
    expect(server.pushes()[0]).toContain("https://ntfy.example/portfolio-test");
    expect(server.pushes()[0]).toContain(NEW);
    expect(result.output).toContain(`Rolled back to ${OLD}`);
  });

  it("skips a digest that was marked bad until a newer image arrives", () => {
    const server = createServer({ running: OLD, remote: NEW, broken: [NEW] });
    server.run();

    const skipped = server.run();

    expect(skipped.status).toBe(0);
    expect(server.upDigests()).toEqual([NEW, OLD]);
    expect(server.pushes()).toHaveLength(1);
    expect(skipped.output).toContain("marked bad");

    const NEWER = "sha256:3333333333333333333333333333333333333333333333333333333333333333";
    server.setRemote(NEWER);
    const deployed = server.run();

    expect(deployed.status).toBe(0);
    expect(server.running()).toBe(NEWER);
  });

  it("fails and pushes a notification when there is no previous container to roll back to", () => {
    const server = createServer({ remote: NEW, broken: [NEW] });

    const result = server.run();

    expect(result.status).not.toBe(0);
    expect(server.upDigests()).toEqual([NEW]);
    expect(server.pushes()).toHaveLength(1);
  });

  it("rolls back when the new container hangs past the time limit", () => {
    const server = createServer({ running: OLD, remote: NEW, hanging: [NEW], waitTimeout: 1 });

    const result = server.run();

    expect(result.status).not.toBe(0);
    expect(server.running()).toBe(OLD);
    expect(server.pushes()).toHaveLength(1);
  });

  it("pushes a notification and fails when the rollback fails too", () => {
    const server = createServer({ running: OLD, remote: NEW, broken: [NEW, OLD] });

    const result = server.run();

    expect(result.status).not.toBe(0);
    expect(server.upDigests()).toEqual([NEW, OLD]);
    expect(server.pushes()).toHaveLength(1);
    expect(result.output).toContain("Rollback");
  });

  it("prints what it would deploy in a dry run without pulling or changing anything", () => {
    const server = createServer({ running: OLD, remote: NEW });

    const result = server.run("--dry-run");

    expect(result.status).toBe(0);
    expect(result.output).toContain(`Would deploy ${NEW}`);
    expect(server.localDigest()).toBe(OLD);
    expect(server.running()).toBe(OLD);
    expect(server.dockerCalls().filter((call) => /^compose (pull|up)/.test(call))).toEqual([]);
    expect(server.pushes()).toEqual([]);
  });

  it("reports a marked-bad digest in a dry run", () => {
    const server = createServer({ running: OLD, remote: NEW, broken: [NEW] });
    server.run();

    const result = server.run("--dry-run");

    expect(result.status).toBe(0);
    expect(result.output).toContain("marked bad");
  });
});
