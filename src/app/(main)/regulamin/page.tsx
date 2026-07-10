"use client";

import SubpageHero from "@/components/SubpageHero";

export default function RegulaminPage() {
  return (
    <main>
      <SubpageHero
        subtitle="HYDRA ARMS / Regulamin sklepu"
        title="Regulamin sklepu"
        video="/video/rain.mp4"
        titleClass="text-[clamp(3rem,9vw,100px)] font-semibold text-text leading-none tracking-[-3px] relative z-[6] ml-[-4px]"
      />

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          REGULAMIN SKLEPU INTERNETOWEGO HYDRA ARMS SP. Z O.O.
        </div>

        <div className="space-y-10 text-text-dim text-sm leading-relaxed">

          <Section title="§ 1. Postanowienia ogólne i dane rejestrowe">
            <ol className="space-y-3 list-none">
              <Li n="1">Sklep internetowy działający pod adresem URL <span className="text-accent">https://hydra-arms.com</span> prowadzony jest przez firmę HYDRA ARMS Sp. z o.o. z siedzibą w Krakowie (30-614), ul. Cechowa 44B, wpisaną do rejestru przedsiębiorców Krajowego Rejestru Sądowego prowadzonego przez Sąd Rejonowy dla Krakowa-Śródmieścia w Krakowie, XI Wydział Gospodarczy KRS pod numerem KRS: 0001111593, posiadającą NIP: 6793302181 oraz REGON: 528976880, o kapitale zakładowym w wysokości 5.100,00 PLN (zwaną: „Sprzedawcą").</Li>
              <Li n="2">Kontakt ze Sprzedawcą odbywa się za pośrednictwem formularza kontaktowego w witrynie, poczty elektronicznej pod adresem: <span className="text-accent">sprzedaz@hydra-arms.com</span> i telefonicznie pod numerem telefonu udostępnionym w zakładce Kontakt.</Li>
              <Li n="3">Niniejszy Regulamin określa zasady korzystania ze Sklepu, warunki składania zamówień i zakupu towarów ogólnodostępnych, procedury obowiązkowej weryfikacji pełnoletności dla produktów z kategorii „18+", a także restrykcyjne zasady rezerwacji internetowej towarów koncesjonowanych oraz procedury reklamacyjne i zwrotów.</Li>
            </ol>
          </Section>

          <Section title="§ 2. Definicje i klasyfikacja asortymentu">
            <ol className="space-y-3 list-none">
              <Li n="1"><strong className="text-white">Sprzedawca</strong> – HYDRA ARMS Sp. z o.o.</Li>
              <Li n="2"><strong className="text-white">Klient</strong> – osoba fizyczna posiadająca pełną zdolność do czynności prawnych, osoba prawna lub jednostka organizacyjna nieposiadająca osobowości prawnej, dokonująca zakupów lub rezerwacji w Sklepie.</Li>
              <Li n="3"><strong className="text-white">Konsument</strong> – osoba fizyczna dokonująca ze Sprzedawcą czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową.</Li>
              <Li n="4"><strong className="text-white">Przedsiębiorca na prawach Konsumenta</strong> – osoba fizyczna zawierająca umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy z treści tej umowy wynika, że nie posiada ona dla niej charakteru zawodowego.</Li>
              <Li n="5"><strong className="text-white">Towar Ogólnodostępny (Niekoncesjonowany)</strong> – wszelkie produkty dostępne w Sklepie, do nabycia których nie są wymagane specjalne uprawnienia ani kryteria wiekowe (np. akcesoria strzeleckie, elementy montażowe, optyka celownicza, odzież, oporządzenie taktyczne).</Li>
              <Li n="6"><strong className="text-white">Towar 18+ (Ograniczony wiekowo)</strong> – produkty niekoncesjonowane, których sprzedaż i udostępnianie jest na mocy prawa lub decyzji Sprzedawcy ograniczone wyłącznie do osób pełnoletnich (np. repliki ASG o podwyższonej energii kinetycznej, noże, narzędzia taktyczne, wybrane akcesoria obronne).</Li>
              <Li n="7"><strong className="text-white">Towar Koncesjonowany</strong> – materiały wybuchowe, broń palna, amunicja, istotne części broni palnej oraz wyroby o przeznaczeniu wojskowym lub policyjnym w rozumieniu ustawy z dnia 13 czerwca 2019 r. o wykonywaniu działalności gospodarczej w zakresie wytwarzania i obrotu materiałami wybuchowymi, bronią, amunicją oraz wyrobami i technologią o przeznaczeniu wojskowym lub policyjnym.</Li>
            </ol>
          </Section>

          <Section title="§ 3. Warunki sprzedaży i rezerwacji">
            <ol className="space-y-4 list-none">
              <Li n="1"><strong className="text-white">TOWARY OGÓLNODOSTĘPNE:</strong> Sprzedaż odbywa się na zasadach standardowej umowy sprzedaży zawieranej na odległość. Zamówienia są realizowane w drodze wysyłkowej pod wskazany adres na terenie Polski.</Li>
              <Li n="2">
                <strong className="text-white">TOWARY 18+:</strong> Sprzedaż tych towarów dopuszczalna jest wyłącznie na rzecz osób pełnoletnich. Sprzedawca zastrzega sobie prawo do wdrożenia dwustopniowej weryfikacji wieku Klienta:
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a">Elektroniczne oświadczenie lub autoryzacja wieku na etapie składania zamówienia w systemie teleinformatycznym.</SubLi>
                  <SubLi l="b">Obowiązkowa weryfikacja pełnoletności przez kuriera przy doręczeniu przesyłki (wysyłka z zastrzeżeniem opcji dostawy „do rąk własnych osoby pełnoletniej" za okazaniem dokumentu tożsamości) lub osobiście w sklepie stacjonarnym. W przypadku negatywnej weryfikacji wieku towar nie zostanie wydany, a umowa ulega rozwiązaniu z winy Klienta.</SubLi>
                </ul>
              </Li>
              <Li n="3">
                <strong className="text-white">TOWARY KONCESJONOWANE:</strong>
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a">Zgodnie z prawem, zabrania się standardowej sprzedaży wysyłkowej materiałów wybuchowych, broni, amunicji, wyrobów oraz technologii o przeznaczeniu wojskowym lub policyjnym klientom indywidualnym na odległość.</SubLi>
                  <SubLi l="b">Prezentacja materiałów wybuchowych, broni, amunicji, a także wyrobów oraz technologii o przeznaczeniu wojskowym lub policyjnym w Sklepie internetowym nie stanowi oferty handlowej w rozumieniu art. 66 k.c. lecz zaproszenie do zawarcia umowy (art. 71 k.c.).</SubLi>
                  <SubLi l="c">Klient może za pośrednictwem Sklepu dokonać wyłącznie bezpłatnej rezerwacji Towaru Koncesjonowanego w celu jego późniejszego obejrzenia i ewentualnego zakupu.</SubLi>
                  <SubLi l="d">Zawarcie umowy sprzedaży, ostateczna zapłata ceny oraz fizyczny odbiór zarezerwowanego Towaru Koncesjonowanego odbywa się WYŁĄCZNIE OSOBIŚCIE w koncesjonowanym sklepie stacjonarnym Sprzedawcy w Krakowie – o ile nie ustalono dostawy w reżimie koncesyjnym.</SubLi>
                  <SubLi l="e">Bezwzględnym warunkiem wydania Towaru Koncesjonowanego jest osobiste okazanie przez Klienta aktualnych, oryginalnych i ważnych dokumentów uprawniających do zakupu towaru koncesjonowanego. Brak dokumentu skutkuje natychmiastową odmową wydania towaru.</SubLi>
                </ul>
              </Li>
            </ol>
          </Section>

          <Section title="§ 4. Składanie zamówień i rezerwacji">
            <ol className="space-y-3 list-none">
              <Li n="1">Klient może składać zamówienia lub dokonywać rezerwacji przez 24 godziny na dobę, 7 dni w tygodniu za pośrednictwem interfejsu Sklepu internetowego.</Li>
              <Li n="2">W celu złożenia zamówienia/rezerwacji, Klient kompletuje koszyk, wybiera odpowiedni dla danej kategorii towaru sposób dostawy/odbioru oraz formę płatności, a następnie zatwierdza proces przyciskiem „Zamawiam z obowiązkiem zapłaty" lub równoważnym.</Li>
              <Li n="3">Wszystkie ceny podane w Sklepie są cenami brutto (zawierają podatek VAT) wyrażonymi w złotych polskich (PLN). Ceny nie zawierają kosztów dostawy, które są jawnie komunikowane w trakcie procedury składania zamówienia.</Li>
            </ol>
          </Section>

          <Section title="§ 5. Płatności i dostawa (dla towarów niekoncesjonowanych)">
            <ol className="space-y-4 list-none">
              <Li n="1">
                Sprzedawca udostępnia następujące formy płatności:
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a">Szybki przelew natychmiastowy lub płatność BLIK za pośrednictwem zintegrowanego operatora płatności elektronicznych (Przelewy24 / Autopay).</SubLi>
                  <SubLi l="b">Płatność kartą płatniczą/kredytową.</SubLi>
                  <SubLi l="c">Tradycyjny przelew bankowy na konto Sprzedawcy.</SubLi>
                  <SubLi l="d">Płatność gotówką lub kartą w przypadku odbioru osobistego w sklepie stacjonarnym.</SubLi>
                </ul>
              </Li>
              <Li n="2">Dostawa Towarów Ogólnodostępnych realizowana jest wyłącznie na terytorium Rzeczypospolitej Polskiej za pośrednictwem firm kurierskich.</Li>
              <Li n="3">Dostawa Towarów 18+, które nie stanowią towarów koncesjonowanych możliwa jest za pośrednictwem firm kurierskich po odbyciu weryfikacji wieku na stronie np. za pomocą aplikacji mObywatel – wówczas dane odbiorcy przesyłki muszą być tożsame z danymi osoby poddającej się weryfikacji na etapie składania zamówienia. Dostępność usługi weryfikacji może być ograniczona – wówczas istnieje wyłącznie możliwość odbioru osobistego w sklepie stacjonarnym.</Li>
              <Li n="4">Czas realizacji zamówienia wynosi od 1 do 14 dni roboczych od momentu zaksięgowania wpłaty lub autoryzacji transakcji, o ile przy produkcie nie wskazano innego terminu.</Li>
            </ol>
          </Section>

          <Section title="§ 6. Prawo odstąpienia od umowy">
            <ol className="space-y-3 list-none">
              <Li n="1">Konsument oraz Przedsiębiorca na prawach Konsumenta ma ustawowe prawo odstąpić od umowy zakupu Towaru Ogólnodostępnego oraz Towaru 18+ zawartej na odległość bez podania przyczyny w terminie 14 dni od dnia objęcia towaru w posiadanie.</Li>
              <Li n="2">Aby skorzystać z prawa odstąpienia, Klient musi jednoznacznie poinformować Sprzedawcę o swojej decyzji (np. poprzez oświadczenie wysłane pocztą tradycyjną lub elektronicznie na adres: <span className="text-accent">sprzedaz@hydra-arms.com</span> lub przesłanie dedykowanego formularza zwrotu).</Li>
              <Li n="3">Klient ma obowiązek zwrócić towar na adres magazynu Sprzedawcy niezwłocznie, nie później niż 14 dni od dnia odstąpienia od umowy. Koszty bezpośredniego zwrotu (odesłania) towaru pokrywa w całości Klient.</Li>
              <Li n="4">Sprzedawca zwraca Klientowi wszystkie dokonane płatności, w tym koszty dostarczenia towaru do Klienta (z wyjątkiem dodatkowych kosztów wynikających z wybranego przez Klienta sposobu dostawy innego niż najtańszy zwykły sposób oferowany przez Sklep), w terminie 14 dni od otrzymania oświadczenia. Sprzedawca może wstrzymać się ze zwrotem płatności do czasu otrzymania towaru z powrotem lub dostarczenia dowodu jego odesłania.</Li>
              <Li n="5">Prawo do odstąpienia od umowy zawartej na odległość NIE PRZYSŁUGUJE w stosunku do towarów koncesjonowanych odbieranych w sklepie stacjonarnym, które są objęte rezerwacją internetową. Wynika to z faktu, że umowa sprzedaży oraz przeniesienie własności broni/amunicji następuje fizycznie i bezpośrednio w salonie stacjonarnym Sprzedawcy po weryfikacji dokumentów (nie jest to umowa zawarta na odległość).</Li>
            </ol>
          </Section>

          <Section title="§ 7. Reklamacje">
            <ol className="space-y-3 list-none">
              <Li n="1">Sprzedawca ma bezwzględny prawny obowiązek dostarczyć Klientowi towar zgodny z umową i wolny od wad.</Li>
              <Li n="2">W przypadku stwierdzenia braku zgodności towaru z umową, Konsumentowi oraz Przedsiębiorcy na prawach Konsumenta przysługują uprawnienia określone w ustawie o prawach konsumenta (żądanie naprawy, wymiany, obniżenia ceny lub – przy wadach istotnych – odstąpienia od umowy).</Li>
              <Li n="3">Reklamacje należy składać na adres poczty elektronicznej: <span className="text-accent">sprzedaz@hydra-arms.com</span> lub pisemnie na adres siedziby. Sprzedawca zobowiązuje się ustosunkować do reklamacji w nieprzekraczalnym terminie 14 dni od dnia jej otrzymania.</Li>
            </ol>
          </Section>

          <Section title="§ 8. Ochrona danych osobowych">
            <ol className="space-y-3 list-none">
              <Li n="1">Administratorem danych osobowych Klientów jest HYDRA ARMS Sp. z o.o. w Krakowie.</Li>
              <Li n="2">Dane osobowe są przetwarzane w celu realizacji zamówień, weryfikacji pełnoletności, obsługi rezerwacji towarów koncesjonowanych, prowadzenia konta oraz rozpatrywania reklamacji, zgodnie z przepisami Ogólnego Rozporządzenia o Ochronie Danych (RODO) oraz przepisami ustaw szczególnych. Szczegółowe informacje zawarte są w <a href="/polityka-prywatnosci" className="text-accent hover:text-white transition-colors">Polityce Prywatności</a>.</Li>
            </ol>
          </Section>

          <Section title="§ 9. Postanowienia końcowe">
            <ol className="space-y-3 list-none">
              <Li n="1">Umowy zawierane za pośrednictwem Sklepu internetowego sporządzane są w języku polskim.</Li>
              <Li n="2">Prawem właściwym dla umów jest prawo polskie.</Li>
              <Li n="3">Sprzedawca zastrzega sobie prawo do modyfikacji Regulaminu z ważnych przyczyn (np. zmiany przepisów prawa regulujących obrót bronią, zmiany stawek podatkowych lub metod płatności). Do umów i rezerwacji zawartych przed zmianą Regulaminu stosuje się wersję obowiązującą w dacie złożenia zamówienia/rezerwacji przez Klienta.</Li>
              <Li n="4">W sprawach nieuregulowanych mają zastosowanie powszechnie obowiązujące przepisy prawa, w szczególności: Kodeksu Cywilnego, Ustawy o prawach konsumenta, Ustawy o świadczeniu usług drogą elektroniczną oraz Ustawy z dnia 13 czerwca 2019 r. o wykonywaniu działalności gospodarczej w zakresie wytwarzania i obrotu materiałami wybuchowymi, bronią, amunicją oraz wyrobami i technologią o przeznaczeniu wojskowym lub policyjnym.</Li>
              <Li n="5">Regulamin wchodzi w życie z dniem 18 czerwca 2026 roku.</Li>
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
