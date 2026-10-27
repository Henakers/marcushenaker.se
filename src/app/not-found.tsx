import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/content";

// Next.js adds `noindex` to every 404 response itself, so it is not repeated here.
export const metadata: Metadata = {
  title: { absolute: getContent().notFoundMetadata().title },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 pt-24 pb-20">
      <p className="font-mono text-xs text-stone-400">404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        There is nothing at this address. It may have moved, or the link may be mistyped.
      </p>
      <Link href="/" className="mt-10 inline-block font-semibold text-accent hover:underline">
        ← Back to the home page
      </Link>
    </main>
  );
}
