"use client";

import SubpageHero from "@/components/SubpageHero";

export default function PolitykWskPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Polityka WSK"
        title="Polityka WSK"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          Wewnętrzny System Kontroli · Obrót Strategiczny
        </div>

        <div className="space-y-8 text-text-dim text-sm leading-relaxed">
          <p>
            Intencją HYDRA ARMS Sp. z o. o. jest przestrzeganie zasad kontroli obrotu określonych
            w krajowych i międzynarodowych przepisach prawnych oraz wykluczenie osiągania zysku
            w sposób sprzeczny z niniejszą polityką.
          </p>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-3">
              Nadzór i wdrożenie
            </h2>
            <p>
              Biorąc pod uwagę obowiązujące przepisy, w firmie zostało utworzone stanowisko Pełnomocnika
              ds. Koncesji i Jakości, który nadzoruje wszystkie sprawy związane z obrotem oraz zajmuje się
              wdrożeniem i utrzymywaniem Wewnętrznego Systemu Kontroli (WSK). W systemie określono procedury
              postępowania i zakresy obowiązków poszczególnych pracowników. Działania te zapewniają zgodność
              procedur stosowanych w firmie z przepisami prawa.
            </p>
          </div>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-3">
              Reżimy kontrolne i zezwolenia eksportowe
            </h2>
            <p>
              Polska uczestniczy w wielu reżimach kontrolnych, które nadzorują obrót towarami, materiałami,
              technologiami i oprogramowaniem podwójnego zastosowania oraz uzbrojeniem. HYDRA ARMS Sp. z o. o.
              dokonuje obrotu wyrobami wymienionymi w Wykazach Towarów i Technologii o znaczeniu strategicznym.
            </p>
            <p className="mt-3">
              W wielu przypadkach firma potrzebuje zezwoleń na eksport dla wysyłki zagranicę produktów.
              Pozwolenia te mogą być wymagane z wielu powodów, takich jak umieszczenie danego towaru w wykazach
              towarów i technologii objętych szczególną kontrolą, stosowanie zaawansowanych technologii,
              końcowego odbiorcy lub końcowego zastosowania podlegających szczególnej kontroli.
              Pełnomocnik ds. Koncesji i Jakości nadzoruje prawidłowość realizowanych transakcji z przepisami prawa.
            </p>
          </div>

          <div>
            <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-3">
              Sankcje i odpowiedzialność
            </h2>
            <p>
              Naruszenie przepisów i procedur kontroli obrotu może narazić HYDRA ARMS Sp. z o. o. i osoby
              odpowiedzialne za obrót na różne sankcje administracyjne i karne. Każdy pracownik firmy, który
              świadomie naruszy obowiązujące przepisy będzie surowo ukarany, włącznie ze zwolnieniem z pracy.
            </p>
          </div>

          <p>
            Wdrożenie Wewnętrznego Systemu Kontroli pozwoli wyeliminować transakcje lub praktyki postępowania,
            które są niezgodne z obowiązującymi przepisami. O wszystkich takich przypadkach należy informować
            Prezesa Zarządu osobiście, w celu podjęcia niezbędnych działań zgodnych z procedurami określonymi
            w przepisach prawa.
          </p>

          <div className="border-t border-white/10 pt-8 mt-8">
            <p className="font-[var(--font-mono)] text-xs text-text-dim/60 uppercase tracking-[0.2em]">Prezes Zarządu</p>
            <p className="font-[var(--font-mono)] text-white text-sm mt-1">Łukasz Sekuła</p>
            <p className="font-[var(--font-mono)] text-xs text-text-dim/40 mt-3">
              Oświadczenie otrzymali: Pełnomocnik ds. Kontroli Obrotu
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
