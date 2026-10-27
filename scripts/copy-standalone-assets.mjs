// The standalone server does not include static assets; copy them in so `pnpm start`
// and the seam-2 tests serve the same files the container will.
import fs from "node:fs";

const copies = [
  [".next/static", ".next/standalone/.next/static"],
  ["public", ".next/standalone/public"],
];

for (const [from, to] of copies) {
  if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
}
