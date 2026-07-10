"use client";

import SubpageHero from "@/components/SubpageHero";

export default function RegulaminUslugPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Regulamin usług"
        title="Regulamin usług"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          REGULAMIN ŚWIADCZENIA USŁUG ZDALNYCH — HYDRA ARMS SP. Z O.O.
        </div>

        <div className="space-y-10 text-text-dim text-sm leading-relaxed">

          <Section title="§ 1. Postanowienia ogólne">
            <ol className="space-y-3 list-none">
              <Li n="1">Niniejszy regulamin (zwany: „Regulaminem") określa zasady korzystania ze strony internetowej <span className="text-accent">https://hydra-arms.com</span> oraz warunki zdalnego zamawiania i realizacji specjalistycznych usług inżynieryjnych, projektowych i produkcyjnych przez HYDRA ARMS Sp. z o.o. w Krakowie.</Li>
              <Li n="2">Usługodawcą i Wykonawcą jest HYDRA ARMS Sp. z o.o. w Krakowie (30-614) przy ul. Cechowa 44B, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: 0001111593, posiadająca numery NIP: 6793302181 oraz REGON: 528976880, o kapitale zakładowym w wysokości 5.100,00 PLN (zwana: „Wykonawcą").</Li>
              <Li n="3">Kontakt z Wykonawcą jest możliwy za pośrednictwem adresu poczty elektronicznej: <span className="text-accent">office@hydra-arms.com</span>, formularza kontaktowego w Serwisie i pisemnie na adres siedziby.</Li>
              <Li n="4">Klientem w rozumieniu Regulaminu jest każdy podmiot składający zamówienie na usługi (w szczególności Konsument, Przedsiębiorca, Przedsiębiorca na prawach konsumenta, inna jednostka organizacyjna lub Instytucja Państwowa, w tym Siły Zbrojne RP i inne formacje mundurowe).</Li>
            </ol>
          </Section>

          <Section title="§ 2. Zakres świadczonych usług i restrykcje koncesyjne">
            <ol className="space-y-4 list-none">
              <Li n="1">
                Wykonawca świadczy specjalistyczne usługi produkcyjno-inżynieryjne na indywidualne zamówienie Klienta, w szczególności w zakresie:
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a">Projektowania inżynieryjnego, inżynierii odwrotnej i modelowania CAD/3D.</SubLi>
                  <SubLi l="b">Prototypowania i szybkiego wytwarzania przy użyciu technologii druku 3D (przyrostowych).</SubLi>
                  <SubLi l="c">Zaawansowanej obróbki ubytkowej (obróbka skrawaniem CNC, frezowanie, toczenie, elektrodrążenie).</SubLi>
                  <SubLi l="d">Analiz inżynieryjnych, obliczeń wytrzymałościowych (szacunkowych), MES oraz technologicznych.</SubLi>
                </ul>
              </Li>
              <Li n="2">Wszystkie usługi realizowane są ściśle według dostarczonej przez Klienta specyfikacji, rysunków technicznych, założeń konstrukcyjnych lub plików CAD.</Li>
              <Li n="3">W przypadku, gdy przedmiotem zapytania ofertowego lub zamówienia są istotne części broni palnej, amunicji, komponenty uzbrojenia lub wyroby o przeznaczeniu wojskowym lub policyjnym, realizacja usługi podlega bezwzględnym ograniczeniom wynikającym z przepisów prawa.</Li>
              <Li n="4">Przystąpienie do wszelakich prac nad elementami koncesjonowanymi uwarunkowane jest uprzednią weryfikacją formalno-prawną Klienta, w tym przedstawieniem oryginałów dokumentów uprawniających do dysponowania, modyfikacji, wytwarzania lub zakupu rzeczonych wyrobów (właściwa koncesja MSWiA, stosowne pozwolenia, certyfikaty, zamówienia urzędowe Sił Zbrojnych RP lub innych uprawnionych organów). Wykonawca bezwzględnie odmówi realizacji usługi w przypadku braku wymaganych uprawnień po stronie Klienta.</Li>
              <Li n="5">Klient oświadcza, że przedmiot zapytania ofertowego lub zamówienia nie podlega rygorowi koncesyjnemu – o ile nie wyszczególnił takiej okoliczności w zapytaniu ofertowym lub uwagach do zamówienia w formie pisemnej.</Li>
            </ol>
          </Section>

          <Section title="§ 3. Obrót z zagranicą i kontrola eksportu (towary o znaczeniu strategicznym)">
            <ol className="space-y-3 list-none">
              <Li n="1">Dostawy wyników prac poza terytorium Rzeczypospolitej Polskiej podlegają bezwzględnej weryfikacji pod kątem przepisów ustawy z dnia 29 listopada 2000 r. o obrocie z zagranicą towarami, technologiami i usługami o znaczeniu strategicznym dla bezpieczeństwa państwa, a także właściwych rozporządzeń Parlamentu Europejskiego i Rady w zakresie kontroli wywozu produktów podwójnego zastosowania (dual-use) i uzbrojenia.</Li>
              <Li n="2">Zamówienia zagraniczne (wewnątrzunijne oraz poza obszar celny UE) wymagają każdorazowego indywidualnego rozpatrzenia przez Wykonawcę. Warunkiem realizacji zamówienia jest uzyskanie przez Wykonawcę (lub przedstawienie przez Klienta) zezwoleń eksportowych, certyfikatów importowych lub deklaracji użytkownika końcowego (End-User Certificate – EUC).</Li>
              <Li n="3">Wykonawca zastrzega sobie prawo do natychmiastowego anulowania zamówienia i odmowy świadczenia usługi, jeżeli weryfikacja wykaże ryzyko naruszenia sankcji międzynarodowych, brak możliwości uzyskania wymaganych zezwoleń lub gdy odbiorca/użytkownik końcowy widnieje na listach odmownych lub sankcyjnych.</Li>
              <Li n="4">Klient oświadcza, że przedmiot zapytania ofertowego lub zamówienia nie podlega ograniczeniom w obrocie z zagranicą – o ile nie wyszczególnił takiej okoliczności w zapytaniu ofertowym lub uwagach do zamówienia w formie pisemnej.</Li>
              <Li n="5">W przypadku gdy przedmiot zamówienia podlega ograniczeniom w zakresie obrotu z zagranicą, klient oświadcza, że ma tego świadomość i zobowiązuje się do dokonywania takiego obrotu bez naruszenia przepisów dotyczących kontroli eksportu.</Li>
            </ol>
          </Section>

          <Section title="§ 4. Procedura składania i realizacji zamówień">
            <ol className="space-y-3 list-none">
              <Li n="1">Zapytania ofertowe i zamówienia składane są drogą elektroniczną poprzez dedykowany formularz na stronie internetowej lub bezpośredni kontakt za pośrednictwem poczty elektronicznej.</Li>
              <Li n="2">W celu otrzymania precyzyjnej wyceny, Klient przesyła szczegółowy opis założeń technicznych, pliki projektowe (preferowane formaty: STEP, STL, IGES, DWG) oraz specyfikację materiałową.</Li>
              <Li n="3">Wykonawca, po analizie technologicznej oraz weryfikacji prawnej (koncesyjnej/eksportowej), w terminie do 14 dni roboczych przesyła Klientowi ofertę zawierającą: wycenę, przewidywany termin realizacji, ewentualne wymagania dokumentacyjne oraz koszty dostawy.</Li>
              <Li n="4">Oferta jest ważna przez okres 30 dni od dnia jej wysłania, chyba że w jej treści wskazano inny termin związany np. z wahaniami cen surowców.</Li>
              <Li n="5">Umowę uważa się za zawartą z chwilą jednoznacznego zaakceptowania oferty przez Klienta (w formie dokumentowej/pisemnej), dopełnienia wszelkich obowiązków weryfikacyjnych (jeśli dotyczy) oraz zaksięgowania zaliczki/płatności zgodnie z warunkami oferty na koncie Wykonawcy.</Li>
            </ol>
          </Section>

          <Section title="§ 5. Wynagrodzenie i płatności">
            <ol className="space-y-3 list-none">
              <Li n="1">Ceny podawane w indywidualnej ofercie są cenami netto (do których zostanie doliczony podatek VAT w obowiązującej stawce) lub brutto, wyrażonymi w złotych polskich (PLN) lub walucie uzgodnionej w ofercie.</Li>
              <Li n="2">Wykonawca dopuszcza formy płatności: przelew tradycyjny na konto bankowe, zintegrowane płatności elektroniczne lub faktura z odroczonym terminem płatności.</Li>
              <Li n="3">Dostępne formy płatności są uzależnione od konkretnego zakresu zamówienia.</Li>
              <Li n="4">Odroczony termin płatności przysługuje wyłącznie stałym klientom biznesowym (po pozytywnej weryfikacji kredytowej) oraz instytucjom państwowym i jednostkom budżetowym (np. Siły Zbrojne RP, Policja) na podstawie oficjalnego zamówienia ofertowego.</Li>
              <Li n="5">W przypadku usług o wartości powyżej 1 000 PLN netto lub zamówień o wysokim stopniu zindywidualizowania, Wykonawca ma prawo uzależnić przystąpienie do prac od wpłaty zadatku lub zaliczki w wysokości określonej w ofercie (standardowo 50–100%).</Li>
            </ol>
          </Section>

          <Section title="§ 6. Prawa własności intelektualnej i poufność (NDA)">
            <ol className="space-y-3 list-none">
              <Li n="1">Klient oświadcza i gwarantuje, że posiada wszelkie autorskie prawa majątkowe, prawa do wzorów przemysłowych, patenty lub licencje do materiałów, plików, modeli i dokumentacji, które przekazuje Wykonawcy w celu realizacji zamówienia. Wykonawca nie ponosi odpowiedzialności za naruszenie praw własności intelektualnej osób trzecich wynikające z realizacji projektu według specyfikacji dostarczonej przez Klienta.</Li>
              <Li n="2">Autorskie prawa majątkowe do projektów, modeli 3D i dokumentacji technicznej stworzonych od zera przez inżynierów Wykonawcy przechodzą na Klienta z chwilą opłacenia w pełnej wysokości faktury końcowej, o ile strony nie postanowią inaczej w odrębnej, pisemnej umowie.</Li>
              <Li n="3">Strony zobowiązują się do zachowania w ścisłej poufności wszelkich informacji technicznych, technologicznych, biznesowych i projektowych uzyskanych w trakcie współpracy. Postanowienie to stanowi domyślną i wiążącą klauzulę poufności (NDA). Na żądanie Klienta strony mogą podpisać odrębny dokument NDA przed przekazaniem plików CAD.</Li>
            </ol>
          </Section>

          <Section title="§ 7. Dostawa i odbiór usług">
            <ol className="space-y-3 list-none">
              <Li n="1">Wyniki prac o charakterze niematerialnym (projekty, pliki CAD/3D, analizy inżynieryjne) dostarczane są drogą elektroniczną na wskazany adres e-mail lub poprzez bezpieczny serwer wymiany danych.</Li>
              <Li n="2">Wyniki prac o charakterze materialnym (prototypy, elementy obrobione mechanicznie, wydruki 3D) wysyłane są ubezpieczoną przesyłką kurierską na koszt Klienta lub podlegają odbiorowi osobistemu.</Li>
              <Li n="3">Bezwzględny odbiór osobisty w siedzibie Wykonawcy (lub specjalistyczny transport koncesjonowany) obowiązuje w przypadku wszelkich elementów stanowiących wyroby koncesjonowane, broń lub jej istotne części. Wydanie następuje wyłącznie osobie upoważnionej legitymującej się odpowiednimi dokumentami.</Li>
              <Li n="4">Klient jest zobowiązany do zbadania przesyłki materialnej w obecności kuriera. W przypadku stwierdzenia uszkodzeń mechanicznych powstałych w transporcie, warunkiem rozpatrzenia reklamacji logistycznej jest sporządzenie protokołu szkody w obecności kuriera.</Li>
            </ol>
          </Section>

          <Section title="§ 8. Prawo do odstąpienia od umowy">
            <ol className="space-y-3 list-none">
              <Li n="1">Zgodnie z art. 38 ust. 1 pkt 3 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, prawo do odstąpienia od umowy zawartej na odległość lub poza lokalem przedsiębiorstwa NIE przysługuje Konsumentowi oraz Przedsiębiorcy na prawach konsumenta w odniesieniu do umów, w których przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb.</Li>
              <Li n="2">Strony jednoznacznie wskazują, że usługi CNC, druku 3D, szybkiego prototypowania oraz dedykowanego projektowania inżynieryjnego realizowane na podstawie plików lub wytycznych Klienta mają charakter wysoce zindywidualizowany i w związku z tym prawo do odstąpienia od umowy jest całkowicie wyłączone.</Li>
              <Li n="3">W przypadku usług o charakterze czysto usługowym lub ciągłym, rozpoczętych za wyraźną zgodą Klienta przed upływem terminu na odstąpienie, Klient traci to prawo z chwilą pełnego wykonania usługi przez Wykonawcę.</Li>
            </ol>
          </Section>

          <Section title="§ 9. Reklamacje i odpowiedzialność">
            <ol className="space-y-3 list-none">
              <Li n="1">Wykonawca ponosi odpowiedzialność za zgodność wykonanej usługi z zaakceptowaną przez Klienta specyfikacją techniczną, tolerancjami wymiarowymi oraz rysunkiem wykonawczym.</Li>
              <Li n="2">Reklamacje należy składać drogą mailową na adres: <span className="text-accent">sprzedaz@hydra-arms.com</span> – w terminie 14 dni od dnia otrzymania przedmiotu zamówienia. Reklamacja musi zawierać szczegółowy opis wady oraz dokumentację fotograficzną lub raport pomiarowy.</Li>
              <Li n="3">Wykonawca rozpatruje reklamację w terminie 14 dni od jej otrzymania. W przypadku uznania reklamacji, Wykonawca na własny koszt naprawi wadliwy element, wykona go ponownie lub obniży cenę (zwróci odpowiednią część wynagrodzenia).</Li>
              <Li n="4">Wobec Klientów niebędących Konsumentami ani Przedsiębiorcami na prawach konsumenta (czyli w relacjach komercyjnych B2B oraz instytucjonalnych), odpowiedzialność Wykonawcy z tytułu rękojmi za wady oraz za wszelkie szkody zostaje całkowicie wyłączona. Łączna odpowiedzialność odszkodowawcza Wykonawcy z jakiegokolwiek tytułu ograniczona jest maksymalnie do wysokości czystej wartości netto danego zamówienia.</Li>
            </ol>
          </Section>

          <Section title="§ 10. Postanowienia końcowe">
            <ol className="space-y-3 list-none">
              <Li n="1">W sprawach nieuregulowanych Regulaminem zastosowanie mają powszechnie obowiązujące przepisy prawa, w szczególności Kodeksu Cywilnego, Ustawy o prawach konsumenta, Ustawy o świadczeniu usług drogą elektroniczną oraz powołanych ustaw szczególnych.</Li>
              <Li n="2">Wykonawca zastrzega sobie prawo do zmiany Regulaminu z ważnych przyczyn. Do zamówień złożonych przed zmianą stosuje się zasadniczo wersję Regulaminu obowiązującą w dniu zawarcia umowy (akceptacji oferty).</Li>
              <Li n="3">Wszelkie spory wynikające z realizacji umów pomiędzy Wykonawcą a Klientem niebędącym Konsumentem będą poddane pod rozstrzygnięcie sądowi powszechnemu właściwemu miejscowo dla siedziby Wykonawcy.</Li>
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
