// Banned-words guard: fails if any banned word appears in the history of the
// checked-out ref (HEAD by default, or the ref given as the first argument).
//
// It scans, across every commit reachable from that ref:
//   - file contents (every blob any commit has held),
//   - file paths,
//   - commit messages.
// The match is a case-insensitive substring match. The only exemption is the
// content of the CV PDF, which names the employer on purpose.
//
// The word list comes from the BANNED_WORDS environment variable (a repo
// secret in CI), separated by newlines or commas. The guard never prints a
// banned word: it reports where a hit is (file, commit) and which entry of
// the list matched, by number. A path that itself contains a banned word is
// never printed; its commit is reported instead.
//
// Exit codes: 0 clean, 1 banned word found, 2 missing word list or git error.
//
// Usage: BANNED_WORDS=... node scripts/banned-words-guard.ts [ref]

import { execFileSync } from "node:child_process";

const EXEMPT_PATHS = new Set(["public/Marcus-Henaker-CV.pdf"]);

function fail(message: string): never {
  console.error(`banned-words guard: ${message}`);
  process.exit(2);
}

function git(args: string[], input?: string): Buffer {
  try {
    return execFileSync("git", args, {
      input,
      maxBuffer: 1024 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    fail(`git ${args[0]} failed`);
  }
}

function parseWords(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\n\r,]/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);
}

/** 1-based numbers of the list entries found in the text. */
function matches(text: string, words: string[]): number[] {
  const haystack = text.toLowerCase();
  const found: number[] = [];
  words.forEach((word, index) => {
    if (haystack.includes(word)) found.push(index + 1);
  });
  return found;
}

function describeEntries(entries: number[]): string {
  return `banned word list ${entries.length === 1 ? "entry" : "entries"} #${entries.join(", #")}`;
}

/** Reads many blobs in one `git cat-file --batch` call. */
function readBlobs(shas: string[]): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();
  if (shas.length === 0) return blobs;
  const output = git(["cat-file", "--batch"], `${shas.join("\n")}\n`);
  let offset = 0;
  while (offset < output.length) {
    const headerEnd = output.indexOf(0x0a, offset);
    const [sha, , size] = output.subarray(offset, headerEnd).toString("utf8").split(" ");
    const start = headerEnd + 1;
    const end = start + Number(size);
    blobs.set(sha ?? "", output.subarray(start, end));
    offset = end + 1; // skip the newline after each object
  }
  return blobs;
}

function main(): void {
  const words = parseWords(process.env.BANNED_WORDS);
  if (words.length === 0) {
    fail("BANNED_WORDS is empty or unset; refusing to pass without a word list");
  }

  const ref = process.argv[2] ?? "HEAD";
  const findings: string[] = [];

  // Commits, oldest first, so a hit is reported at the commit that introduced it.
  const commits = git(["rev-list", "--reverse", ref]).toString("utf8").split("\n").filter(Boolean);

  // Commit messages.
  const log = git(["log", "-z", "--format=%H%n%B", ref]).toString("utf8");
  for (const entry of log.split("\0").filter(Boolean)) {
    const newline = entry.indexOf("\n");
    const sha = entry.slice(0, newline);
    const hits = matches(entry.slice(newline + 1), words);
    if (hits.length > 0)
      findings.push(`commit message of ${sha} contains ${describeEntries(hits)}`);
  }

  // Paths and the blobs they pointed at, across every commit.
  const reportedPaths = new Set<string>();
  const blobFirstSeen = new Map<string, { path: string; commit: string }>();
  for (const commit of commits) {
    const tree = git(["ls-tree", "-r", "-z", "--full-tree", commit]).toString("utf8");
    for (const line of tree.split("\0").filter(Boolean)) {
      const tab = line.indexOf("\t");
      const [, type, sha] = line.slice(0, tab).split(" ");
      const path = line.slice(tab + 1);
      if (type !== "blob" || sha === undefined) continue;

      const pathHits = matches(path, words);
      if (pathHits.length > 0 && !reportedPaths.has(path)) {
        reportedPaths.add(path);
        findings.push(`a file path in commit ${commit} contains ${describeEntries(pathHits)}`);
      }

      if (!EXEMPT_PATHS.has(path) && !blobFirstSeen.has(sha)) {
        blobFirstSeen.set(sha, { path, commit });
      }
    }
  }

  // File contents.
  const blobs = readBlobs([...blobFirstSeen.keys()]);
  for (const [sha, { path, commit }] of blobFirstSeen) {
    const hits = matches(blobs.get(sha)?.toString("utf8") ?? "", words);
    if (hits.length === 0) continue;
    const where = matches(path, words).length > 0 ? `a file (blob ${sha})` : path;
    findings.push(`${where} in commit ${commit} contains ${describeEntries(hits)}`);
  }

  if (findings.length > 0) {
    console.error(`banned-words guard: ${findings.length} hit(s) in the history of ${ref}:`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exit(1);
  }
  console.log(`banned-words guard: ${commits.length} commit(s) of ${ref} are clean`);
}

main();
