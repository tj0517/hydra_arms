"use client";

import SubpageHero from "@/components/SubpageHero";

export default function KontaktPage() {
  return (
    <main>
      <SubpageHero subtitle="HYDRA ARMS / Kontakt" title="Kontakt" video="/aerial-view.mp4" />

      <section className="min-h-[50vh] flex items-center justify-center">
        <p className="font-[var(--font-mono)] text-sm text-text-dim tracking-wide">
          [ W PRZYGOTOWANIU ]
        </p>
      </section>
    </main>
  );
}
