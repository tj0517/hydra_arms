import type { Metadata } from 'next';
import SubpageHero from '@/components/SubpageHero';

export const metadata: Metadata = {
  title: 'Sklep',
  alternates: { canonical: '/sklep' },
};

export default function SklepPage() {
  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/video/hero-video.mp4" />
      <section className="border-t border-white/[0.25] px-[clamp(24px,5vw,64px)] py-28 flex flex-col items-center justify-center gap-4">
        <span className="font-[var(--font-mono)] text-[11px] text-accent/50 tracking-[0.25em] uppercase">// STATUS</span>
        <p className="font-[var(--font-mono)] text-[clamp(1.2rem,3vw,2rem)] text-white tracking-[0.1em] uppercase">
          W trakcie realizacji
        </p>
        <span className="terminal-blink text-accent text-xl">█</span>
      </section>
    </main>
  );
}
