"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  code: string;
  caption?: string;
}

let idCounter = 0;

export default function MermaidBlock({ code, caption }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++idCounter}`);

  useEffect(() => {
    if (!containerRef.current || !code) return;
    let cancelled = false;

    import("mermaid").then((mod) => {
      if (cancelled) return;
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          background: "#0a0a0a",
          primaryColor: "#1a1a1a",
          primaryTextColor: "#e5e5e5",
          lineColor: "#d4a843",
          edgeLabelBackground: "#111",
        },
      });
      mermaid
        .render(idRef.current, code)
        .then(({ svg }) => {
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          if (!cancelled) setError(String(err));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-6 border border-red-800/60 bg-red-950/30 rounded px-4 py-3">
        <p className="font-[var(--font-mono)] text-xs text-red-400 uppercase tracking-widest mb-1">
          Błąd diagramu
        </p>
        <pre className="text-red-300 text-xs whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <figure className="my-8">
      <div
        ref={containerRef}
        className="overflow-x-auto rounded border border-white/10 bg-[#0d0d0d] p-4 flex justify-center"
      />
      {caption && (
        <figcaption className="mt-2 text-center font-[var(--font-mono)] text-xs text-text-dim tracking-widest">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
