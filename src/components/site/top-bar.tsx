import Link from "next/link";
import type { TopBar as TopBarContent } from "@/content";

/** The name linking home plus the section links. Not sticky, no hamburger: the links fit on a phone. */
export function TopBar({ name, links }: TopBarContent & { name: string }) {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6">
      <Link href="/" className="font-semibold">
        {name}
      </Link>
      <nav className="flex gap-6 text-sm text-muted">
        {links.map(({ label, href }) => (
          <a key={href} href={href} className="hover:text-accent">
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
