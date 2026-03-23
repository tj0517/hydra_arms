"use client";

import SubpageHero from "@/components/SubpageHero";

export default function SklepPage() {
  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Sklep" title="Sklep" video="/hero-video.mp4" />

      <section className="min-h-[50vh] flex items-center justify-center">
        <p className="font-[var(--font-mono)] text-sm text-text-dim tracking-wide">
          [ W PRZYGOTOWANIU ]
        </p>
      </section>
    </main>
  );
}
