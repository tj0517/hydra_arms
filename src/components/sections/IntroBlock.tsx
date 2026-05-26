import ScrollRevealText from "@/components/ScrollRevealText";
import CornerCTA from "@/components/ui/CornerCTA";

interface IntroBlockProps {
  text: string;
  ctaHref?: string;
  ctaLabel?: string;
  borderBottom?: boolean;
  py?: string;
}

export default function IntroBlock({
  text,
  ctaHref,
  ctaLabel,
  borderBottom = false,
  py = "py-20 md:py-32",
}: IntroBlockProps) {
  return (
    <section
      className={`${py} px-[clamp(32px,5vw,64px)]${borderBottom ? " border-b border-white/10" : ""}`}
    >
      <ScrollRevealText
        text={text}
        className="text-[1.4rem] md:text-[3.2vw] font-medium text-text-dim leading-[1.3] md:leading-[1.1] tracking-[-0.48px] text-justify"
        indent={2}
      />
      {ctaHref && ctaLabel && (
        <div className="flex justify-end mt-11">
          <CornerCTA href={ctaHref} label={ctaLabel} />
        </div>
      )}
    </section>
  );
}
