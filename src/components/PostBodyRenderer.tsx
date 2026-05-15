"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { urlFor } from "@/sanity/image";

const MermaidBlock = dynamic(() => import("./MermaidBlock"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PostBodyRenderer({ body }: { body: any[] }) {
  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => <p className="mb-4 leading-relaxed text-text-dim">{children}</p>,
      h1: ({ children }) => <h1 className="mt-10 mb-4 text-3xl font-bold text-white tracking-tight">{children}</h1>,
      h2: ({ children }) => <h2 className="mt-8 mb-3 text-2xl font-bold text-white tracking-tight">{children}</h2>,
      h3: ({ children }) => <h3 className="mt-6 mb-2 text-xl font-semibold text-white">{children}</h3>,
      h4: ({ children }) => <h4 className="mt-4 mb-2 text-lg font-semibold text-white">{children}</h4>,
      blockquote: ({ children }) => (
        <blockquote className="my-6 border-l-2 border-accent pl-4 text-text-dim italic">{children}</blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-1 text-text-dim">{children}</ul>,
      number: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-1 text-text-dim">{children}</ol>,
    },
    listItem: {
      bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
      number: ({ children }) => <li className="leading-relaxed">{children}</li>,
    },
    marks: {
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      underline: ({ children }) => <span className="underline">{children}</span>,
      "strike-through": ({ children }) => <span className="line-through">{children}</span>,
      code: ({ children }) => (
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-[var(--font-mono)] text-sm text-accent">
          {children}
        </code>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      externalLink: ({ children, value }: any) => (
        <a
          href={value?.url}
          target={value?.openInNewTab ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="text-accent underline hover:text-white transition-colors"
        >
          {children}
        </a>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      internalLink: ({ children, value }: any) => (
        <Link href={value?.href || "/"} className="text-accent underline hover:text-white transition-colors">
          {children}
        </Link>
      ),
    },
    types: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postImage: ({ value }: any) => {
        if (!value?.image?.asset) return null;
        const src = urlFor(value.image).width(1200).url();
        const layout: string = value.layout || "full";

        const imgEl = (
          <div
            className={`relative aspect-video overflow-hidden rounded ${
              layout === "left" ? "float-left mr-6 mb-4 w-1/2" :
              layout === "right" ? "float-right ml-6 mb-4 w-1/2" :
              layout === "center" ? "mx-auto w-2/3" :
              "w-full"
            }`}
          >
            <Image src={src} alt={value.alt || ""} fill className="object-cover" />
          </div>
        );

        return (
          <figure className={`my-6 ${layout === "full" || layout === "center" ? "clear-both" : ""}`}>
            {imgEl}
            {value.caption && (
              <figcaption className="mt-2 text-center font-[var(--font-mono)] text-xs text-text-dim tracking-widest clear-both">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mermaidBlock: ({ value }: any) => (
        <MermaidBlock code={value?.code || ""} caption={value?.caption} />
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calloutBlock: ({ value }: any) => {
        const type: string = value?.type || "info";
        const styles: Record<string, string> = {
          info: "border-blue-500/50 bg-blue-950/30 text-blue-200",
          warning: "border-yellow-500/50 bg-yellow-950/30 text-yellow-200",
          tip: "border-green-500/50 bg-green-950/30 text-green-200",
        };
        const icons: Record<string, string> = { info: "ℹ", warning: "⚠", tip: "✦" };
        return (
          <div className={`my-6 flex gap-3 rounded border px-4 py-3 ${styles[type] || styles.info}`}>
            <span className="shrink-0 text-lg leading-tight">{icons[type] || icons.info}</span>
            <p className="leading-relaxed">{value?.text}</p>
          </div>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      codeBlock: ({ value }: any) => (
        <div className="my-6 overflow-hidden rounded border border-white/10">
          {value?.language && (
            <div className="border-b border-white/10 bg-white/5 px-3 py-1.5">
              <span className="font-[var(--font-mono)] text-xs text-text-dim uppercase tracking-widest">
                {value.language}
              </span>
            </div>
          )}
          <pre className="overflow-x-auto bg-[#0d0d0d] p-4">
            <code className="font-[var(--font-mono)] text-sm text-text-dim">{value?.code}</code>
          </pre>
        </div>
      ),
    },
  };

  return <PortableText value={body} components={components} />;
}
