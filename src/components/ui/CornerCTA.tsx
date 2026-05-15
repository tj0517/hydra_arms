"use client";

import ScrambleLink from "@/components/ScrambleLink";

interface CornerCTAProps {
  href: string;
  label: string;
  className?: string;
  linkClassName?: string;
  target?: string;
  rel?: string;
}

export default function CornerCTA({
  href,
  label,
  className,
  linkClassName,
  target,
  rel,
}: CornerCTAProps) {
  return (
    <div className={`relative px-6 py-1.5 inline-flex items-center w-fit${className ? ` ${className}` : ""}`}>
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
      <ScrambleLink
        href={href}
        className={`font-[var(--font-mono)] text-[14px] tracking-[1.12px]${linkClassName ? ` ${linkClassName}` : ""}`}
        target={target}
        rel={rel}
      >
        {label}
      </ScrambleLink>
    </div>
  );
}
