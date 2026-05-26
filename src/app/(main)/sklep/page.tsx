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
      <section className="min-h-[50vh] flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-px h-16 bg-white/10" />
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.3em] text-text-dim">
          Sklep jest w budowie
        </p>
      </section>
    </main>
  );
}
