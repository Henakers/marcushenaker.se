import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const guard = fileURLToPath(new URL("./banned-words-guard.ts", import.meta.url));

const repos: string[] = [];

afterEach(() => {
  for (const repo of repos.splice(0)) {
    rmSync(repo, { recursive: true, force: true });
  }
});

function git(repo: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/** A throwaway git repo in a temp directory. */
function createRepo() {
  const repo = mkdtempSync(join(tmpdir(), "banned-words-guard-"));
  repos.push(repo);
  git(repo, "init", "--quiet", "--initial-branch=main");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "commit.gpgsign", "false");
  return {
    write(path: string, content: string) {
      const file = join(repo, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    },
    remove(path: string) {
      git(repo, "rm", "--quiet", path);
    },
    commit(message: string): string {
      git(repo, "add", "--all");
      git(repo, "commit", "--quiet", "--allow-empty", "-m", message);
      return git(repo, "rev-parse", "HEAD");
    },
    runGuard(bannedWords: string | undefined) {
      const env = { ...process.env };
      delete env.BANNED_WORDS;
      if (bannedWords !== undefined) env.BANNED_WORDS = bannedWords;
      const result = spawnSync(process.execPath, [guard], {
        cwd: repo,
        env,
        encoding: "utf8",
      });
      return {
        status: result.status,
        output: `${result.stdout}${result.stderr}`,
      };
    },
  };
}

const BANNED = "Acmecorp\nWidgetworks";

describe("banned-words guard", () => {
  it("passes a repo that contains none of the banned words", () => {
    const repo = createRepo();
    repo.write("README.md", "# A clean portfolio\n");
    repo.commit("feat: add readme");

    const result = repo.runGuard(BANNED);

    expect(result.status).toBe(0);
  });

  it("fails on a banned word in file content, naming the file but not the word", () => {
    const repo = createRepo();
    repo.write("content/case-study.mdx", "I worked at ACMECORP for years.\n");
    repo.commit("feat: add case study");

    const result = repo.runGuard(BANNED);

    expect(result.status).toBe(1);
    expect(result.output).toContain("content/case-study.mdx");
    expect(result.output.toLowerCase()).not.toContain("acmecorp");
  });

  it("fails on a banned word in a file path, without printing the path", () => {
    const repo = createRepo();
    repo.write("docs/widgetworks-notes.md", "Nothing to see here.\n");
    const sha = repo.commit("docs: add notes");

    const result = repo.runGuard(BANNED);

    expect(result.status).toBe(1);
    expect(result.output).toContain(sha);
    expect(result.output.toLowerCase()).not.toContain("widgetworks");
  });

  it("fails on a banned word in a commit message, naming the commit", () => {
    const repo = createRepo();
    repo.write("README.md", "# A clean portfolio\n");
    const sha = repo.commit("feat: port the Acmecorp dashboard");

    const result = repo.runGuard(BANNED);

    expect(result.status).toBe(1);
    expect(result.output).toContain(sha);
    expect(result.output.toLowerCase()).not.toContain("acmecorp");
  });

  it("fails on a banned word that exists only in history", () => {
    const repo = createRepo();
    repo.write("notes.txt", "Draft written at Widgetworks.\n");
    const sha = repo.commit("docs: add draft");
    repo.write("notes.txt", "Draft.\n");
    repo.commit("docs: anonymise draft");

    const result = repo.runGuard(BANNED);

    expect(result.status).toBe(1);
    expect(result.output).toContain("notes.txt");
    expect(result.output).toContain(sha);
    expect(result.output.toLowerCase()).not.toContain("widgetworks");
  });

  it("exempts the CV PDF path, and only that path", () => {
    const repo = createRepo();
    repo.write("public/Marcus-Henaker-CV.pdf", "%PDF Software Engineer, Acmecorp\n");
    repo.commit("feat: add CV");

    expect(repo.runGuard(BANNED).status).toBe(0);

    repo.write("public/other.pdf", "%PDF Acmecorp\n");
    repo.commit("feat: add another PDF");

    const result = repo.runGuard(BANNED);
    expect(result.status).toBe(1);
    expect(result.output).toContain("public/other.pdf");
    expect(result.output).not.toContain("Marcus-Henaker-CV.pdf");
  });

  it("accepts a comma-separated word list", () => {
    const repo = createRepo();
    repo.write("README.md", "Built at widgetworks.\n");
    repo.commit("docs: add readme");

    expect(repo.runGuard(" acmecorp , widgetworks ").status).toBe(1);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["only separators", " ,\n , "],
  ])("fails when the word list is %s", (_label, bannedWords) => {
    const repo = createRepo();
    repo.write("README.md", "# A clean portfolio\n");
    repo.commit("feat: add readme");

    const result = repo.runGuard(bannedWords);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("BANNED_WORDS");
  });
});
