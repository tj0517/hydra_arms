"use client";

import SubpageHero from "@/components/SubpageHero";

export default function PolitykJakosciPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Polityka jakości"
        title="Polityka jakości"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          PN-EN ISO 9001:2015 · AQAP 2110:2016
        </div>

        <div className="space-y-8 text-text-dim text-sm leading-relaxed">
          <p>
            HYDRA ARMS SP. Z O. O. prowadzi politykę zapewniającą jakość we wszystkich obszarach swojego działania.
            W celu realizacji polityki jakości firma wdrożyła i stosuje system zarządzania jakością zgodny z Normą
            PN-EN ISO 9001:2015, dokumentem NATO – AQAP 2110:2016 i wymaganiami Ustawy dotyczącej obrotu towarami strategicznymi.
          </p>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-4">
              Zakres systemu zarządzania jakością
            </h2>
            <ul className="space-y-2 border-l border-accent/20 pl-6">
              {[
                "Produkcja broni i amunicji niezawierającej materiałów wybuchowych",
                "Produkcja sprzętu specjalnego dla wojska i policji. Usługi rusznikarskie",
                "Obrót materiałami wybuchowymi, bronią, amunicją, wyposażeniem, dla wojska i policji",
                "Obróbka skrawaniem CNC i przyrostowa. Usługi szkoleniowe",
                "Obrót towarami strategicznymi z zagranicą",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-accent/50 select-none">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-3">
              Misja i cel strategiczny
            </h2>
            <p>
              Misją firmy jest zdobycie klientów i ich utrzymanie, zdobycie stabilnej pozycji w dostawach wyrobów
              na potrzeby obronności i bezpieczeństwa państwa.
            </p>
            <p className="mt-3">
              Strategicznym celem firmy jest zaspokojenie zmieniających się potrzeb i wymagań Klientów poprzez wysoką
              jakość świadczonych usług z uwzględnieniem ochrony środowiska i klimatu.
            </p>
          </div>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-4">
              Podstawowe cele operacyjne
            </h2>
            <ul className="space-y-2 border-l border-accent/20 pl-6">
              {[
                "Zaspokojenie potrzeb i wymagań Klientów",
                "Utrzymanie zaufania dotychczasowych i zdobycie nowych klientów",
                "Wysoka jakość i wiarygodność świadczonych prac",
                "Wykonywanie prac zgodnie z wymaganiami dokumentów normatywnych",
                "Uwzględnianie w działaniach ochrony środowiska i klimatu",
                "Niezwłoczne i obiektywne rozpatrywanie reklamacji",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-accent/50 select-none">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p>
            Deklarowana polityka jakości jest realizowana poprzez ścisłą współpracę całego personelu firmy.
            Kierownictwo firmy nie przewiduje odstępstw od zadeklarowanej polityki zarządzania jakością.
          </p>

          <p>
            Deklaruję rozwój i doskonalenie Systemu Zarządzania Jakością, opisanego w „Księdze Jakości"
            jako zobowiązanie osobiste i całego personelu firmy.
          </p>

          <div className="border-t border-white/10 pt-8 mt-8">
            <p className="font-[var(--font-mono)] text-xs text-text-dim/60 uppercase tracking-[0.2em]">Prezes Zarządu</p>
            <p className="font-[var(--font-mono)] text-white text-sm mt-1">Łukasz Sekuła</p>
          </div>
        </div>
      </section>
    </main>
  );
}
