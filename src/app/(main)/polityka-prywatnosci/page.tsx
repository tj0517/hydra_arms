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

      <section className="px-[clamp(32px,5vw,64px)] py-20 max-w-4xl mx-auto">
        <div className="font-[var(--font-mono)] text-xs text-accent uppercase tracking-[0.25em] mb-8">
          POLITYKA PRYWATNOŚCI HYDRA ARMS SP. Z O.O. W KRAKOWIE
        </div>

        <div className="space-y-10 text-text-dim text-sm leading-relaxed">

          <Section title="§ 1. Postanowienia ogólne">
            <ol className="space-y-3 list-none">
              <Li n="1">Administratorem danych osobowych zbieranych za pośrednictwem Serwisu Internetowego działającego pod adresem <span className="text-accent">https://hydra-arms.com</span> jest HYDRA ARMS Sp. z o.o. z siedzibą w Krakowie (30-614), ul. Cechowa 44B, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: 0001111593, posiadająca numery NIP: 6793302181 oraz REGON: 528976880, o kapitale zakładowym w wysokości 5.100,00 PLN (dalej zwana: „Administratorem").</Li>
              <Li n="2">
                Kontakt z Administratorem w sprawach związanych z ochroną danych osobowych jest możliwy za pośrednictwem:
                <ul className="mt-2 space-y-2 border-l border-accent/20 pl-6">
                  <SubLi l="a">adresu poczty elektronicznej: <span className="text-accent">rodo@hydra-arms.pl</span></SubLi>
                  <SubLi l="b">formularzy kontaktowych w ramach Serwisu.</SubLi>
                  <SubLi l="c">poczty tradycyjnej na adres siedziby: ul. Cechowa 44B, 30-614 Kraków.</SubLi>
                </ul>
              </Li>
              <Li n="3">Administrator oświadcza, że przetwarza dane osobowe użytkowników Serwisu w zgodności z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) oraz polską ustawą z dnia 10 maja 2018 r. o ochronie danych osobowych.</Li>
            </ol>
          </Section>

          <Section title="§ 2. Zakres, cele, podstawy prawne i okresy przechowywania danych">
            <p className="mb-4">Administrator przetwarza dane osobowe w ramach następujących procesów i celów operacyjnych:</p>
            <div className="space-y-6">

              <ProcessBlock title="1. Rejestracja i prowadzenie Konta Klienta w Sklepie">
                <Row label="Zakres danych">imię, nazwisko, adres e-mail, numer telefonu, adres zamieszkania/dostawy, hasło (w formie bezpiecznie zaszyfrowanej jednostronnym algorytmem).</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy o świadczenie usługi drogą elektroniczną.</Row>
                <Row label="Okres przechowywania">do czasu zgłoszenia żądania usunięcia Konta przez Klienta lub rozwiązania umowy przez Administratora zgodnie z Regulaminem.</Row>
              </ProcessBlock>

              <ProcessBlock title="2. Obsługa i realizacja zamówień (towary niekoncesjonowane, usługi CNC/3D)">
                <Row label="Zakres danych">imię, nazwisko, adres dostawy, adres rozliczeniowy, numer telefonu, adres e-mail; w przypadku podmiotów gospodarczych dodatkowo: pełna nazwa firmy i NIP.</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. b RODO – niezbędność do wykonania umowy sprzedaży lub umowy o świadczenie usług.</Row>
                <Row label="Okres przechowywania">przez czas niezbędny do pełnej realizacji zamówienia/usługi, a następnie przez okres przedawnienia ewentualnych roszczeń cywilnoprawnych (standardowo 6 lat od końca roku, w którym umowa została sfinalizowana).</Row>
              </ProcessBlock>

              <ProcessBlock title={'3. Obowiązkowa weryfikacja wieku (Kategoria \u201eTowary 18+\u201d)'}>
                <Row label="Zakres danych">imię, nazwisko, data urodzenia, status pełnoletności (potwierdzony dokumentem tożsamości).</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego związanego z zakazem udostępniania i sprzedaży wyrobów ograniczonych wiekowo osobom nieletnim.</Row>
                <Row label="Okres przechowywania">dane weryfikowane są w czasie rzeczywistym (przy odbiorze/doręczeniu); Administrator nie archiwizuje skanów dowodów tożsamości, a jedynie odnotowuje fakt pozytywnej weryfikacji.</Row>
              </ProcessBlock>

              <ProcessBlock title="4. Internetowa rezerwacja towarów koncesjonowanych">
                <Row label="Zakres danych">imię, nazwisko, adres e-mail, adres zamieszkania/siedziby, numer PESEL, numer telefonu, seria i numer dokumentu tożsamości, seria i numer pozwolenia na broń / promesy lub poświadczeń koncesyjnych podmiotu.</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. b RODO w zw. z przepisami ustawy z dnia 13 czerwca 2019 r. o wykonywaniu działalności gospodarczej w zakresie wytwarzania i obrotu materiałami wybuchowymi, bronią, amunicją oraz wyrobami i technologią o przeznaczeniu wojskowym lub policyjnym.</Row>
                <Row label="Okres przechowywania">do momentu sfinalizowania zakupu w stacjonarnym punkcie sprzedaży lub anulowania/wygaśnięcia rezerwacji internetowej.</Row>
              </ProcessBlock>

              <ProcessBlock title="5. Obowiązki podatkowo-księgowe i ewidencja obrotu strategicznego">
                <Row label="Zakres danych">dane niezbędne do wystawienia faktury VAT oraz pełne dane wymagane przepisami prawa do prowadzenia urzędowych ksiąg ewidencji obrotu bronią, amunicją oraz towarami i technologiami o znaczeniu strategicznym (dual-use).</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego wynikającego z przepisów ustawy o podatku od towarów i usług, Ordynacji podatkowej, ustawy o rachunkowości oraz ustawy o obrocie z zagranicą towarami, technologiami i usługami o znaczeniu strategicznym.</Row>
                <Row label="Okres przechowywania">dane księgowe przez 5 lat od końca roku kalendarzowego, w którym upłynął termin płatności podatku. Dane ewidencyjne dotyczące obrotu bronią i towarami strategicznymi przez rygorystyczne, wieloletnie lub wieczyste okresy określone wprost w przepisach ustaw koncesyjnych.</Row>
              </ProcessBlock>

              <ProcessBlock title="6. Obsługa reklamacji i odstąpień od umowy">
                <Row label="Zakres danych">imię, nazwisko, adres e-mail, numer telefonu, adres korespondencyjny, numer zamówienia, numer rachunku bankowego (w celu realizacji zwrotu środków).</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. c RODO – wypełnienie obowiązku prawnego wynikającego z przepisów ustawy o prawach konsumenta oraz Kodeksu Cywilnego.</Row>
                <Row label="Okres przechowywania">przez czas trwania procedury reklamacyjnej/zwrotu oraz przez okres niezbędny do obrony lub dochodzenia roszczeń (standardowo 1 rok od zakończenia procedury).</Row>
              </ProcessBlock>

              <ProcessBlock title="7. Formularz kontaktowy i zapytania ofertowe">
                <Row label="Zakres danych">imię, nazwisko, adres e-mail, numer telefonu, nazwa podmiotu, treść wiadomości, załączone pliki techniczne i specyfikacje CAD.</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes Administratora polegający na sprawnej komunikacji i obsłudze zapytań techniczno-ofertowych.</Row>
                <Row label="Okres przechowywania">do czasu ostatecznego zakończenia korespondencji handlowej/technicznej lub zgłoszenia skutecznego sprzeciwu przez Klienta, nie dłużej niż przez 2 lata od ostatniego kontaktu.</Row>
              </ProcessBlock>

              <ProcessBlock title="8. Działania marketingowe i Newsletter">
                <Row label="Zakres danych">imię, adres e-mail.</Row>
                <Row label="Podstawa prawna">art. 6 ust. 1 lit. a RODO – dobrowolna, wyraźna zgoda Klienta wyrażona w Serwisie.</Row>
                <Row label="Okres przechowywania">do momentu wycofania zgody przez Klienta (wypisania się z subskrypcji Newslettera).</Row>
              </ProcessBlock>

            </div>
          </Section>

          <Section title="§ 3. Kategorie odbiorców danych osobowych">
            <p className="mb-4">W celu prawidłowego działania Sklepu oraz realizacji restrykcyjnych procedur prawnych, dane osobowe mogą być przekazywane następującym kategoriom podmiotów przetwarzających:</p>
            <ul className="space-y-2 border-l border-accent/20 pl-6">
              {[
                "Dostawcom usług technologicznych, IT oraz hostingu (w tym podmiotom utrzymującym infrastrukturę serwerową oraz systemy e-commerce).",
                "Operatorom płatności elektronicznych (w celu bezpiecznego procesowania i autoryzacji transakcji on-line).",
                "Podmiotom świadczącym usługi logistyczne, pocztowe i kurierskie (w celu doręczania przesyłek niekoncesjonowanych, w tym kurierom realizującym procedurę weryfikacji tożsamości i pełnoletności odbiorcy).",
                "Podmiotom świadczącym zewnętrzne usługi księgowe, audytorskie, prawne oraz doradcze na rzecz Administratora.",
                "ORGANOM PAŃSTWOWYM I SŁUŻBOM: W związku ze specyfiką branży, w przypadkach określonych przepisami prawa, Administrator ma bezwzględny obowiązek udostępnić dane osobowe uprawnionym organom państwowym – w szczególności Policji, Żandarmerii Wojskowej, Agencji Bezpieczeństwa Wewnętrznego, organom celno-skarbowym, sądom, prokuraturze oraz organom kontroli obrotu towarami o znaczeniu strategicznym (Ministerstwo Rozwoju i Technologii).",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-accent/50 select-none shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="§ 4. Profilowanie i transfer danych poza Europejski Obszar Gospodarczy (EOG)">
            <ol className="space-y-3 list-none">
              <Li n="1">Dane osobowe Klientów nie będą wykorzystywane do podejmowania decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, w tym profilowaniu, które wywoływałoby wobec Klienta skutki prawne lub w podobny sposób istotnie na niego wpływało.</Li>
              <Li n="2">Wykorzystywanie plików cookies do celów statystycznych lub personalizacji reklam nie stanowi profilowania w rozumieniu decyzji zautomatyzowanych.</Li>
              <Li n="3">Administrator co do zasady nie przekazuje danych osobowych poza obszar EOG. W przypadku korzystania z globalnych dostawców narzędzi analitycznych lub marketingowych (np. Google LLC, Meta Platforms), transfer danych odbywa się wyłącznie z zachowaniem najwyższych standardów bezpieczeństwa, w oparciu o Standardowe Klauzule Umowne (SCC) zatwierdzone przez Komisję Europejską.</Li>
            </ol>
          </Section>

          <Section title="§ 5. Prawa osób, których dane dotyczą">
            <p className="mb-4">Zgodnie z RODO, każdemu Klientowi/Użytkownikowi przysługują następujące niezbywalne prawa:</p>
            <ul className="space-y-2 border-l border-accent/20 pl-6">
              {[
                "Prawo dostępu do swoich danych oraz otrzymania ich kopii (Art. 15 RODO).",
                "Prawo do sprostowania (poprawiania) swoich danych (Art. 16 RODO).",
                "Prawo do usunięcia danych (\u201eprawo do bycia zapomnianym\u201d) (Art. 17 RODO) \u2013 z wyłączeniem sytuacji, w których przetwarzanie jest niezbędne do wywiązania się z prawnego obowiązku (np. urzędowe rejestry ewidencji broni, obowiązki podatkowe).",
                "Prawo do ograniczenia przetwarzania danych (Art. 18 RODO).",
                "Prawo do przenoszenia danych do innego administratora (Art. 20 RODO).",
                "Prawo do wniesienia sprzeciwu wobec przetwarzania danych na podstawie prawnie uzasadnionego interesu Administratora (Art. 21 RODO).",
                "Prawo do cofnięcia zgody w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania, którego dokonano na podstawie zgody przed jej cofnięciem (dotyczy np. subskrypcji Newslettera).",
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-accent/50 select-none shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">W celu realizacji swoich praw Użytkownik może skontaktować się pod adresem: <span className="text-accent">rodo@hydra-arms.pl</span>.</p>
            <p className="mt-3">Przysługuje również prawo wniesienia skargi do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>
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

function ProcessBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-accent/10 p-4 space-y-2">
      <p className="font-[var(--font-mono)] text-white text-xs uppercase tracking-[0.15em] mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="font-[var(--font-mono)] text-accent/60 text-xs shrink-0 w-32 pt-0.5 uppercase tracking-wide">{label}:</span>
      <span className="text-text-dim leading-relaxed">{children}</span>
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
