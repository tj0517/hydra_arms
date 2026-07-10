"use client";

import SubpageHero from "@/components/SubpageHero";

export default function PolitykaCookiesPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Polityka cookies"
        title="Polityka cookies"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          POLITYKA PLIKÓW COOKIES — SERWIS HYDRA ARMS
        </div>

        <div className="space-y-10 text-text-dim text-sm leading-relaxed">

          <Section title="§ 1. Postanowienia ogólne">
            <ol className="space-y-3 list-none">
              <Li n="1">Serwis HYDRA ARMS działający pod adresem docelowym <span className="text-accent">https://hydra-arms.com</span> wykorzystuje technologię plików cookies (tzw. „ciasteczka") oraz podobne technologie śledzące i analityczne.</Li>
              <Li n="2">Pliki cookies to małe pliki tekstowe i informacyjne wysyłane przez serwer WWW i zapisywane na urządzeniu końcowym Użytkownika (np. komputerze, laptopie, smartfonie, tablecie), z którego korzysta on podczas przeglądania stron internetowych.</Li>
              <Li n="3">Administratorem danych generowanych przez pliki cookies (w zakresie, w jakim mogą one stanowić dane osobowe lub pozwalać na identyfikację cyfrową Użytkownika) jest HYDRA ARMS Sp. z o.o. z siedzibą w Krakowie. Szczegóły w <a href="/polityka-prywatnosci" className="text-accent hover:text-white transition-colors">Polityce Prywatności</a>.</Li>
            </ol>
          </Section>

          <Section title="§ 2. Rodzaje i celowość wykorzystywanych plików cookies">
            <p className="mb-4">Serwis internetowy HYDRA ARMS stosuje pliki cookies podzielone strukturalnie oraz celowo na następujące kategorie:</p>

            <div className="space-y-6">
              <div>
                <h3 className="font-[var(--font-mono)] text-white/70 text-xs uppercase tracking-[0.15em] mb-3">Ze względu na czas przechowywania</h3>
                <ul className="space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a"><strong className="text-white/80">Cookies sesyjne (session cookies):</strong> pliki o charakterze tymczasowym, które są automatycznie usuwane z urządzenia Użytkownika z chwilą wylogowania z Serwisu, opuszczenia strony internetowej lub całkowitego wyłączenia przeglądarki internetowej.</SubLi>
                  <SubLi l="b"><strong className="text-white/80">Cookies stałe (persistent cookies):</strong> pliki, które pozostają zapisane na urządzeniu Użytkownika przez czas określony w parametrach samego pliku cookie lub do momentu ich samodzielnego, ręcznego usunięcia przez Użytkownika w ustawieniach przeglądarki.</SubLi>
                </ul>
              </div>

              <div>
                <h3 className="font-[var(--font-mono)] text-white/70 text-xs uppercase tracking-[0.15em] mb-3">Ze względu na cel stosowania</h3>
                <ul className="space-y-3 border-l border-accent/20 pl-6">
                  <li>
                    <p><span className="text-accent/80">a)</span> <strong className="text-white/80">Niezbędne pliki cookies:</strong> pliki o krytycznym znaczeniu dla prawidłowego i bezpiecznego funkcjonowania Serwisu. Umożliwiają korzystanie z podstawowych usług (np. utrzymanie bezpiecznej sesji po zalogowaniu, zapamiętywanie produktów dodanych do koszyka, mechanizmy uwierzytelniania transakcji płatniczych). Bez tych plików Serwis nie jest w stanie funkcjonować poprawnie. Ich zablokowanie uniemożliwi dokonywanie zakupów, rezerwacji oraz logowanie. <span className="text-accent/60">Zgoda prawna na ich instalację nie jest wymagana.</span></p>
                  </li>
                  <li>
                    <p><span className="text-accent/80">b)</span> <strong className="text-white/80">Analityczne/wydajnościowe pliki cookies:</strong> pozwalają Administratorowi na zbieranie zagregowanych, anonimowych i czysto statystycznych informacji o sposobie korzystania z Serwisu (np. które podstrony są najczęściej odwiedzane, czas trwania wizyty, źródła ruchu). Administrator korzysta m.in. z narzędzi Google Analytics.</p>
                  </li>
                  <li>
                    <p><span className="text-accent/80">c)</span> <strong className="text-white/80">Funkcjonalne pliki cookies:</strong> pozwalają na zapamiętanie wyborów i preferencji dokonanych indywidualnie przez Użytkownika (np. preferowany język strony, odnotowanie faktu złożenia oświadczenia o pełnoletności dla kategorii produktowych 18+).</p>
                  </li>
                  <li>
                    <p><span className="text-accent/80">d)</span> <strong className="text-white/80">Marketingowe/reklamowe pliki cookies:</strong> wykorzystywane są w celu dopasowywania i targetowania treści reklamowych do zdiagnozowanych preferencji i zainteresowań Użytkowników, zarówno w Serwisie jak i na zewnętrznych platformach (np. Meta Ads, Google Ads), a także do precyzyjnego mierzenia efektywności prowadzonych kampanii promocyjnych.</p>
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="§ 3. Zarządzanie plikami cookies, preferencje i wyrażanie zgody">
            <ol className="space-y-4 list-none">
              <Li n="1">Podczas pierwszej wizyty Użytkownika w Serwisie (lub po wyczyszczeniu pamięci podręcznej) wyświetlany jest interaktywny komunikat (Cookie Banner) informujący o stosowaniu technologii plików cookies.</Li>
              <Li n="2">Instalacja plików analitycznych, funkcjonalnych oraz marketingowych odbywa się WYŁĄCZNIE po wyrażeniu przez Użytkownika świadomej i wyraźnej zgody za pośrednictwem panelu zarządzania na banerze cookies. Użytkownik może zaakceptować wszystkie pliki, odrzucić pliki opcjonalne lub dostosować zgody szczegółowo.</Li>
              <Li n="3">Użytkownik ma prawo w każdej chwili zmienić swoje preferencje lub całkowicie wycofać udzielone zgody.</Li>
              <Li n="4">
                Użytkownik posiada niezależną możliwość konfiguracji własnej przeglądarki internetowej w taki sposób, aby blokowała ona automatyczną obsługę plików cookies. Przykładowe ścieżki konfiguracji:
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <li className="flex gap-3"><span className="text-accent/40 shrink-0">—</span><span><strong className="text-white/70">Google Chrome:</strong> Ustawienia → Prywatność i bezpieczeństwo → Pliki cookie i inne dane witryn.</span></li>
                  <li className="flex gap-3"><span className="text-accent/40 shrink-0">—</span><span><strong className="text-white/70">Mozilla Firefox:</strong> Opcje → Prywatność i bezpieczeństwo → Ciasteczka i dane witryn.</span></li>
                  <li className="flex gap-3"><span className="text-accent/40 shrink-0">—</span><span><strong className="text-white/70">Microsoft Edge:</strong> Ustawienia → Uprawnienia witryny → Pliki cookie i dane witryn.</span></li>
                  <li className="flex gap-3"><span className="text-accent/40 shrink-0">—</span><span><strong className="text-white/70">Safari:</strong> Preferencje → Prywatność → Pliki cookie i dane stron internetowych.</span></li>
                </ul>
              </Li>
              <Li n="5">Systemowe ograniczenie bądź całkowite wyłączenie stosowania plików cookies w przeglądarce wpłynie negatywnie na wybrane funkcjonalności Serwisu (np. brak automatycznego logowania, niemożność utrzymania zawartości koszyka zakupowego, błędy w procesie płatności).</Li>
            </ol>
          </Section>

          <div className="border-t border-white/10 pt-8 mt-8">
            <p className="font-[var(--font-mono)] text-xs text-text-dim/60 uppercase tracking-[0.2em]">Data wejścia w życie</p>
            <p className="font-[var(--font-mono)] text-white text-sm mt-1">18 czerwca 2026</p>
          </div>

        </div>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.2em] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Li({ n, children }: { n: string | number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-accent/50 select-none shrink-0">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

function SubLi({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-accent/40 select-none shrink-0">{l})</span>
      <span>{children}</span>
    </li>
  );
}
