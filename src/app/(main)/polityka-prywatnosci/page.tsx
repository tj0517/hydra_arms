"use client";

import SubpageHero from "@/components/SubpageHero";

export default function PolitykaPrywatnosciPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Polityka prywatności"
        title="Polityka prywatności"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="min-h-[50vh] flex items-center justify-center">
        <p className="font-[var(--font-mono)] text-sm text-text-dim tracking-wide">
          [ W PRZYGOTOWANIU ]
        </p>
      </section>
    </main>
  );
}
