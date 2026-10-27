import { getContent } from "@/content";

export default function HomePage() {
  const { headline } = getContent().home();

  return (
    <main className="mx-auto max-w-6xl px-6 pt-12 pb-20">
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">{headline.title}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{headline.pitch}</p>
    </main>
  );
}
