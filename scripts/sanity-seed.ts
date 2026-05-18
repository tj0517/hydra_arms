/**
 * Seed script — populates Sanity with initial hardcoded content.
 * Run once after setting up the Sanity project:
 *
 *   npx tsx scripts/sanity-seed.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_API_TOKEN   (write token)
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function seed() {
  console.log('🌱 Seeding Sanity CMS...')

  // ── Site settings ─────────────────────────────────────────────
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    companyName: 'HYDRA ARMS SP. Z O.O.',
    nip: '000000000',
    regon: '00000000',
    koncesja: 'B-000/00',
    emailBiuro: 'biuro@hydraarms.pl',
    lat: 50.0647,
    lng: 19.945,
  })
  console.log('✅ siteSettings')

  // ── Navigation ────────────────────────────────────────────────
  await client.createOrReplace({
    _id: 'navigation',
    _type: 'navigation',
    links: [
      { _key: 'start', href: '/', label: 'Start' },
      { _key: 'uslugi', href: '/uslugi', label: 'Usługi' },
      { _key: 'onas', href: '/o-nas', label: 'O nas' },
      { _key: 'aktualnosci', href: '/aktualnosci', label: 'Aktualności' },
      { _key: 'blog', href: '/blog', label: 'Blog' },
      { _key: 'wspolpraca', href: '/wspolpraca', label: 'Współpraca' },
      { _key: 'kontakt', href: '/kontakt', label: 'Kontakt' },
    ],
  })
  console.log('✅ navigation')

  // ── Home page ─────────────────────────────────────────────────
  await client.createOrReplace({
    _id: 'homePage',
    _type: 'homePage',
    heroTagline1: 'Zaawansowana inżynieria obronna',
    heroTagline2: 'Obrót nowoczesnym uzbrojeniem',
    hudLabel: '// HYDRA ARMS - PL-2026',
    aboutText:
      'Realizujemy krytyczne projekty z zakresu wytwarzania uzbrojenia oraz technologii dual-use. Łączymy rygorystyczne standardy NATO z precyzją nowoczesnych technologii tworząc innowacje. Prowadzimy również działalność handlową na rynku cywilnym i specjalnym.',
    heroVideo: '/video/hero-overflow.mp4',
  })
  console.log('✅ homePage')

  // ── Services ──────────────────────────────────────────────────
  const services = [
    {
      id: '01', label: 'Projektowanie i R&D', title: 'Projektowanie i badania rozwojowe',
      desc: 'Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej. Modelowanie 3D, analizy wytrzymałościowe MES, inżynieria odwrotna — każdy projekt przechodzi pełny cykl walidacji przed wejściem do produkcji.',
      tags: ['CAD/CAM', 'Analizy MES', 'Inżynieria odwrotna'], imagePath: '/service-01.jpg', order: 1,
    },
    {
      id: '02', label: 'Produkcja', title: 'Produkcja komponentów',
      desc: 'Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem precyzyjnych technologii CNC, obróbki cieplnej i kontroli jakości zgodnej ze standardami NATO.',
      tags: ['CNC', 'Obróbka cieplna', 'Kontrola jakości'], imagePath: '/service-02.jpg', order: 2,
    },
    {
      id: '03', label: 'Dystrybucja', title: 'Obrót i dystrybucja',
      desc: 'Prowadzimy licencjonowaną działalność handlową w zakresie broni, amunicji oraz wyposażenia specjalnego dla sektora obronnego i odbiorców cywilnych.',
      tags: ['B2G', 'B2B', 'Rynek cywilny'], imagePath: '/service-03.jpg', order: 3,
    },
    {
      id: '04', label: 'Serwis', title: 'Serwis i modernizacja',
      desc: 'Zapewniamy kompleksowy serwis techniczny, modernizację istniejących systemów uzbrojenia oraz dostosowanie do aktualnych standardów operacyjnych.',
      tags: ['Modernizacja', 'Diagnostyka', 'Kalibracja'], imagePath: '/service-04.jpg', order: 4,
    },
  ]

  for (const svc of services) {
    await client.createOrReplace({ _id: `service-${svc.id}`, _type: 'service', ...svc })
  }
  console.log('✅ services')

  // ── Distribution channels (filary) ────────────────────────────
  const channels = [
    { _id: 'dc-b2g', tag: 'B2G', title: 'Zamówienia rządowe', desc: 'Dostawy dla jednostek wojskowych, służb mundurowych i instytucji państwowych realizowane w ramach ścisłych procedur bezpieczeństwa i zamówień publicznych.', order: 1 },
    { _id: 'dc-b2b', tag: 'B2B', title: 'Kooperacja przemysłowa', desc: 'Współpraca z partnerami przemysłowymi w zakresie prototypowania, produkcji seryjnej komponentów i integracji systemów obronnych na zamówienie.', order: 2 },
    { _id: 'dc-b2c', tag: 'B2C', title: 'Rynek cywilny', desc: 'Dystrybucja profesjonalnych systemów broni strzeleckiej i amunicji dla uprawnionych odbiorców indywidualnych zgodnie z obowiązującymi regulacjami.', order: 3 },
  ]

  for (const ch of channels) {
    await client.createOrReplace({ _type: 'distributionChannel', ...ch })
  }
  console.log('✅ distributionChannels')

  // ── O nas page ────────────────────────────────────────────────
  await client.createOrReplace({
    _id: 'oNasPage',
    _type: 'oNasPage',
    introText: 'Powstaliśmy z połączenia ekspertów zaawansowanej inżynierii i sektora strzelecko-obronnego. Ta synergia pozwala nam wytwarzać uzbrojenie, które odpowiada na realne potrzeby użytkownika.',
    missionTitle: 'Nasza misja, Innowacja i rzetelność',
    missionDesc: 'Działamy w oparciu o własną infrastrukturę technologiczną w Krakowie, co pozwala na sprawne zarządzanie kluczowymi procesami produkcyjnymi oraz logistyką obrotu specjalnego.',
    missionItems: [
      { _key: 'mi1', title: 'Wytwarzanie i R&D', desc: 'Projektujemy autorskie rozwiązania, kładąc nacisk na precyzję wykonania i niezawodność mechanizmów.' },
      { _key: 'mi2', title: 'Obrót uzbrojeniem', desc: 'Prowadzimy działalność handlową w zakresie materiałów wybuchowych, broni, amunicji oraz wyrobów i technologii o przeznaczeniu wojskowym lub policyjnym.' },
      { _key: 'mi3', title: 'Synergia branży', desc: 'Inżynierowie w naszych strukturach dbają o parametry techniczne i materiałowe, podczas gdy eksperci branżowi odpowiadają za walidację użytkową sprzętu.' },
    ],
    certCards: [
      { _key: 'cc1', tag: 'MSWiA', title: 'Koncesja MSWiA', desc: 'Posiadamy uprawnienia do wytwarzania broni, amunicji oraz wyrobów o przeznaczeniu wojskowym lub policyjnym, a także obrotu materiałami wybuchowymi, bronią, amunicją oraz wyrobami i technologią o przeznaczeniu wojskowym lub policyjnym.' },
      { _key: 'cc2', tag: 'NATO', title: 'NATO CAGE', desc: 'Jesteśmy dostawcą zarejestrowanym w systemie kodyfikacyjnym NATO, co umożliwia nam współpracę w krajowych i międzynarodowych strukturach obronnych.' },
      { _key: 'cc3', tag: 'Lokalizacja', title: 'Strategiczna lokalizacja', desc: 'Nasze lokalizacje w Małopolsce, przy głównych węzłach komunikacyjnych, zapewniają bezpieczne i profesjonalne zaplecze do realizacji transakcji.' },
    ],
    fundamentyItems: [
      { _key: 'fi1', title: 'Interdyscyplinarne badania i rozwój', desc: 'Nasze projekty badawcze łączą wiele dziedzin nauki.' },
      { _key: 'fi2', title: 'Wszechstronność projektowa', desc: 'Tworzymy koncepcje dla różnych rodzajów uzbrojenia.' },
      { _key: 'fi3', title: 'Nowoczesne materiały', desc: 'Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji.' },
      { _key: 'fi4', title: 'Innowacja procesowa', desc: 'Wdrażamy rozwiązania, które redefiniują skuteczność, ergonomię i trwałość systemów obronnych.' },
      { _key: 'fi5', title: 'Inżynieria precyzyjna', desc: 'Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań.' },
      { _key: 'fi6', title: 'Transparentność', desc: 'Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli.' },
    ],
  })
  console.log('✅ oNasPage')

  // ── Usługi page ───────────────────────────────────────────────
  await client.createOrReplace({
    _id: 'uslugiPage',
    _type: 'uslugiPage',
    introText: 'W HYDRA ARMS proces twórczy zaczyna się od precyzyjnej definicji potrzeb operacyjnych. Nasz zespół inżynierski, wspierany przez praktyków z sektora obronnego, projektuje systemy uzbrojenia i komponenty zorientowane na ekstremalną trwałość i niezawodność.',
    competencies: [
      { _key: 'c1', id: '01', tab: 'Projektowanie i R&D', title: 'Projektowanie i badania rozwojowe', desc: 'Rozwijamy systemy uzbrojenia od koncepcji do kompletnej dokumentacji produkcyjnej.', tags: ['CAD/CAM', 'Analizy MES', 'Inżynieria odwrotna'], cta: 'Zapytaj o projekt' },
      { _key: 'c2', id: '02', tab: 'Obróbka CNC', title: 'Precyzyjna obróbka CNC', desc: 'Wytwarzamy zaawansowane komponenty uzbrojenia z wykorzystaniem wieloosiowych centrów obróbczych CNC.', tags: ['Frezowanie 5-osi', 'Toczenie CNC', 'Kontrola CMM'], cta: 'Zapytaj o produkcję' },
      { _key: 'c3', id: '03', tab: 'Druk 3D', title: 'Druk 3D i prototypowanie', desc: 'Wykorzystujemy technologie przyrostowe do szybkiego prototypowania i produkcji funkcjonalnych komponentów.', tags: ['SLM/DMLS', 'FDM/SLA', 'Rapid prototyping'], cta: 'Zapytaj o prototyp' },
      { _key: 'c4', id: '04', tab: 'Kontrola jakości', title: 'Kontrola jakości i certyfikacja', desc: 'Każdy wyrób przechodzi wieloetapowy proces kontroli jakości zgodny ze standardami NATO AQAP.', tags: ['AQAP', 'Testy balistyczne', 'Metrologia'], cta: 'Zapytaj o certyfikację' },
      { _key: 'c5', id: '05', tab: 'Montaż i serwis', title: 'Montaż końcowy i serwis techniczny', desc: 'Zapewniamy kompleksowy montaż systemów uzbrojenia oraz serwis gwarancyjny i pogwarancyjny.', tags: ['Modernizacja', 'Diagnostyka', 'Kalibracja'], cta: 'Zapytaj o serwis' },
    ],
  })
  console.log('✅ uslugiPage')

  // ── Współpraca page ───────────────────────────────────────────
  await client.createOrReplace({
    _id: 'wspolpracaPage',
    _type: 'wspolpracaPage',
    introText: 'Jesteśmy interdyscyplinarnym ośrodkiem inżynieryjnym specjalizującym się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego i służb porządku publicznego.',
    secondText: 'Swoje usługi kierujemy do szerokiego spektrum odbiorców — od jednostek wojskowych i policyjnych, przez instytucje badawcze, aż po partnerów przemysłowych w modelu B2B. Każda relacja opiera się na dyskrecji, profesjonalizmie i dążeniu do doskonałości technicznej.',
    fundamenty: [
      { _key: 'f1', id: '01', title: 'Interdyscyplinarne badania i rozwój', desc: 'Nasze projekty badawcze łączą wiele dziedzin nauki.' },
      { _key: 'f2', id: '02', title: 'Transparentność operacyjna', desc: 'Działamy w ścisłej zgodności z krajowymi i międzynarodowymi procedurami kontroli obrotu specjalnego.' },
      { _key: 'f3', id: '03', title: 'Nowoczesne materiały', desc: 'Od wysokogatunkowych stopów metali, przez zaawansowane tworzywa sztuczne, aż po kompozyty nowej generacji.' },
      { _key: 'f4', id: '04', title: 'Inżynieria precyzyjna', desc: 'Dysponujemy zapleczem technologicznym zdolnym do realizacji złożonych zadań produkcyjnych i prototypowych.' },
      { _key: 'f5', id: '05', title: 'Wszechstronność projektowa', desc: 'Tworzymy koncepcje dla różnych rodzajów uzbrojenia.' },
    ],
    korzysciTabs: [
      { _key: 'kt1', id: 'suwer', label: 'Suwerenność technologiczna', title: 'Suwerenność technologiczna', desc: 'Rozwijanie krajowych kompetencji w zakresie wytwarzania kluczowych komponentów uzbrojenia i amunicji, redukujące zależność od zewnętrznych łańcuchów dostaw.' },
      { _key: 'kt2', id: 'optym', label: 'Optymalizacja kosztów', title: 'Optymalizacja kosztów', desc: 'Efektywne zarządzanie procesami produkcyjnymi pozwalające na redukcję kosztów przy zachowaniu najwyższych standardów jakości i bezpieczeństwa.' },
      { _key: 'kt3', id: 'adapt', label: 'Szybka adaptacja', title: 'Szybka adaptacja', desc: 'Elastyczne podejście do zmieniających się wymagań operacyjnych, umożliwiające szybkie wdrażanie nowych rozwiązań technologicznych.' },
      { _key: 'kt4', id: 'bezp', label: 'Bezpieczeństwo prawne', title: 'Bezpieczeństwo prawne', desc: 'Pełna zgodność z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego, gwarantująca bezpieczeństwo prawne współpracy.' },
    ],
    ethicsItems: [
      { _key: 'e1', title: 'Bezwzględna zgodność prawna', desc: 'Każda transakcja i proces wytwórczy realizowane są w pełnej zgodności z krajowymi i międzynarodowymi regulacjami dotyczącymi obrotu specjalnego.' },
      { _key: 'e2', title: 'Ochrona informacji', desc: 'Zobowiązujemy się do najwyższych standardów poufności na każdym etapie współpracy — od ofertowania po dostawy.' },
      { _key: 'e3', title: 'Inżynieryjna rzetelność', desc: 'Jako partner strategiczny, zobowiązujemy się do transparentności procesów badawczo-wytwórczych oraz ochrony interesu bezpieczeństwa państwa na każdym etapie cyklu życia produktu.' },
    ],
  })
  console.log('✅ wspolpracaPage')

  console.log('\n🎉 Seed complete! All documents created in Sanity.')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
