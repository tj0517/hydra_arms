"use client";

import Image from "next/image";
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
    img: "/img/draws/drone.png",
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    img: "/img/draws/vest.png",
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    img: "/img/draws/cnc.png",
  },
  {
    tag: "Cywilny",
    title: "Rynek cywilny",
    desc: "Dystrybucja broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych — myśliwych, kolekcjonerów i sportowców.",
    href: "/wspolpraca",
    img: "/img/draws/scope.png",
  },
];

export const USLUGI_SEGMENTS: Segment[] = [
  {
    tag: "Wojsko",
    title: "Siły Zbrojne",
    desc: "Dostarczamy uzbrojenie i wyposażenie spełniające najwyższe standardy wojskowe, testowane w warunkach operacyjnych.",
    href: "/wspolpraca",
    img: "/img/draws/knife.png",
  },
  {
    tag: "Formacje",
    title: "Służby mundurowe",
    desc: "Współpracujemy z policją, strażą graniczną i innymi formacjami mundurowymi, oferując dedykowane rozwiązania.",
    href: "/wspolpraca",
    img: "/img/draws/flashlight.png",
  },
  {
    tag: "B2B",
    title: "Przemysł B2B",
    desc: "Realizujemy zlecenia dla partnerów przemysłowych — od prototypowania po produkcję seryjną komponentów obronnych.",
    href: "/wspolpraca",
    img: "/img/draws/axis.png",
  },
  {
    tag: "Cywilny",
    title: "Rynek cywilny",
    desc: "Oferujemy produkty i rozwiązania dla rynku cywilnego — myśliwych, kolekcjonerów oraz firm zajmujących się bezpieczeństwem prywatnym.",
    href: "/wspolpraca",
    img: "/img/draws/binoculars.png",
  },
];

interface ClientSegmentsGridProps {
  segments: Segment[];
  topBorder?: boolean;
  glow?: "white" | "green" | "blue";
  plain?: boolean;
}

export default function ClientSegmentsGrid({ segments, topBorder = false, glow = "green", plain = false }: ClientSegmentsGridProps) {
  const tagClass = "font-[var(--font-mono)] text-[10px] tracking-[0.25em] text-accent/50 border border-accent/20 px-2.5 py-1 inline-block mb-5 w-fit";
  const cols = segments.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  const inter = segments.length === 4 ? "md:px-8" : "md:px-10";
  const interL = segments.length === 4 ? "md:pl-8" : "md:pl-10";
  const interR = segments.length === 4 ? "md:pr-8" : "md:pr-10";

  const cellPad = (i: number) => {
    if (i === 0) return `px-[clamp(32px,5vw,64px)] ${interR} md:pl-[clamp(32px,5vw,64px)]`;
    if (i === segments.length - 1) return `px-[clamp(32px,5vw,64px)] ${interL} md:pr-[clamp(32px,5vw,64px)]`;
    return `px-[clamp(32px,5vw,64px)] ${inter}`;
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${cols}${topBorder ? " border-t border-white/[0.08]" : ""}`}
    >
      {segments.map((seg, i) => (
        <div
          key={seg.tag}
          className={`${i < segments.length - 1 ? "md:border-r" : ""} border-b border-white/[0.08] flex flex-col py-8 md:py-12 ${cellPad(i)}`}
        >
          <div className="h-[260px] hidden md:block mb-8">
            {plain ? (
              <Image src={seg.img} alt={seg.title} width={900} height={450} className="w-full h-full object-contain" draggable={false} />
            ) : (
              <TacticalEdge src={seg.img} alt={seg.title} glow={glow} width={900} height={450} className="w-full h-full" />
            )}
          </div>
          <div className="flex flex-col flex-1">
            <div className={tagClass}>
              {seg.tag}
            </div>
            <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-normal text-text leading-[1.1] mb-4">
              {seg.title}
            </h3>
            <p className="font-[var(--font-mono)] text-[11px] tracking-[0.12em] uppercase text-text-dim leading-[1.9] text-justify">
              {seg.desc}
            </p>
            <div className="mt-auto pt-8">
              <CornerCTA href={seg.href} label="Dowiedz się więcej" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
