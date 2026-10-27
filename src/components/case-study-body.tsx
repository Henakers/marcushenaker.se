import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";

/**
 * The slot for a Case study's architecture diagram, used in MDX as
 * `<ArchitectureDiagram caption="...">...</ArchitectureDiagram>`. The children are the diagram
 * itself (an inline SVG or an image); without them a placeholder box is shown.
 */
function ArchitectureDiagram({ caption, children }: { caption: string; children?: ReactNode }) {
  return (
    <figure className="my-8">
      {children ?? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white font-mono text-sm text-stone-400">
          architecture diagram
        </div>
      )}
      <figcaption className="mt-2 text-sm text-stone-500">{caption}</figcaption>
    </figure>
  );
}

/** Marks a Case study whose text is still placeholder, so it can never pass for the real thing. */
function Placeholder() {
  return (
    <p className="mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Placeholder: this case study is not written yet. The text and numbers below stand in for it.
    </p>
  );
}

const components = {
  ArchitectureDiagram,
  Placeholder,
  h2: (props: ComponentProps<"h2">) => <h2 className="mt-12 text-2xl font-bold" {...props} />,
  h3: (props: ComponentProps<"h3">) => <h3 className="mt-8 text-lg font-bold" {...props} />,
  p: (props: ComponentProps<"p">) => <p className="mt-4 leading-relaxed text-muted" {...props} />,
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mt-4 list-disc space-y-1 pl-6 leading-relaxed text-muted" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-1 pl-6 leading-relaxed text-muted" {...props} />
  ),
  a: ({ href = "", ...props }: ComponentProps<"a">) => (
    <Link href={href} className="font-semibold text-accent hover:underline" {...props} />
  ),
};

/** Renders a Case study's MDX body at build time, with the site's styles and MDX components. */
export async function CaseStudyBody({ source }: { source: string }) {
  const { default: Body } = await evaluate(source, runtime);
  return <Body components={components} />;
}
