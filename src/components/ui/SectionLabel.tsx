interface SectionLabelProps {
  label: string;
}

export default function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="border-t border-white/[0.25] px-[clamp(32px,5vw,64px)] py-2">
      <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
        {label}
      </span>
    </div>
  );
}
