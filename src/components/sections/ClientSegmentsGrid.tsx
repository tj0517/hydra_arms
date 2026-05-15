"use client";

import TacticalEdge from "@/components/TacticalEdge";
import CornerCTA from "@/components/ui/CornerCTA";

export interface Segment {
  tag: string;
  title: string;
  desc: string;
  img: string;
  href: string;
}

export const CLIENT_SEGMENTS: Segment[] = [
  {
    tag: "Wojsko",
    title: "Siły Zbrojne",
    desc: "Dostarczamy uzbrojenie i wyposażenie spełniające najwyższe standardy wojskowe, testowane w warunkach operacyjnych.",
    href: "/wspolpraca",
    img: "/img/army-ranger-in-field-uniforms-2026-03-18-17-39-05-utc.jpg",
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    img: "/img/tactical-gun-in-olive-glove-on-white-backdrop-2026-03-20-00-48-48-utc.jpg",
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    img: "/img/cnc-part.png",
  },
];

interface ClientSegmentsGridProps {
  segments: Segment[];
  topBorder?: boolean;
}

export default function ClientSegmentsGrid({ segments, topBorder = false }: ClientSegmentsGridProps) {
  return (
    <div
      className={`mx-[clamp(32px,5vw,64px)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3${topBorder ? " border-t border-white/[0.08]" : ""}`}
    >
      {segments.map((seg, i) => (
        <div
          key={seg.tag}
          className={`${i < segments.length - 1 ? "md:border-r" : ""} border-b border-white/[0.08] flex flex-col py-8 md:py-12 ${
            i === 0
              ? "md:pr-10"
              : i === segments.length - 1
              ? "md:pl-10"
              : "md:px-10"
          }`}
        >
          <div className="h-[260px] hidden md:block mb-8">
            <TacticalEdge
              src={seg.img}
              alt={seg.title}
              glow="green"
              width={900}
              height={450}
              className="w-full h-full"
            />
          </div>
          <div>
            <div className="font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5">
              {seg.tag}
            </div>
            <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">
              {seg.title}
            </h3>
            <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] mb-8 text-justify">
              {seg.desc}
            </p>
            <CornerCTA href={seg.href} label="Dowiedz się więcej" />
          </div>
        </div>
      ))}
    </div>
  );
}
