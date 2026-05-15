import type { PostCardData } from '@/components/PostCard'
import type { PostDetailData } from '@/components/PostDetailClient'

// Shared lorem body used by all mock detail pages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loremBody: any[] = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's1',
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'h2',
    children: [{ _type: 'span', _key: 's2', text: 'Tło i kontekst', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b3',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's3',
        text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio, et tempus feugiat.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'calloutBlock',
    _key: 'cb1',
    type: 'info',
    text: 'Ważna informacja: wszystkie dane zawarte w tym artykule mają charakter poglądowy i nie stanowią porady prawnej ani handlowej.',
  },
  {
    _type: 'block',
    _key: 'b4',
    style: 'h3',
    children: [{ _type: 'span', _key: 's4', text: 'Szczegóły techniczne', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b5',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's5',
        text: 'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b6',
    style: 'normal',
    children: [{ _type: 'span', _key: 's6', text: 'Kluczowe punkty:', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b7',
    style: 'normal',
    listItem: 'bullet',
    children: [{ _type: 'span', _key: 's7', text: 'Certyfikacja zgodna z normą NATO STANAG 4172', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b8',
    style: 'normal',
    listItem: 'bullet',
    children: [{ _type: 'span', _key: 's8', text: 'Pełna dokumentacja dostępna na żądanie klientów B2G', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b9',
    style: 'normal',
    listItem: 'bullet',
    children: [{ _type: 'span', _key: 's9', text: 'Obsługa zamówień powyżej 50 000 PLN netto z dedykowanym opiekunem', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'codeBlock',
    _key: 'code1',
    language: 'yaml',
    code: `# Przykładowa specyfikacja zamówienia\norder:\n  category: ammunition\n  caliber: 9x19\n  quantity: 5000\n  unit: rounds\n  delivery: DDP Warsaw`,
  },
  {
    _type: 'block',
    _key: 'b10',
    style: 'h2',
    children: [{ _type: 'span', _key: 's10', text: 'Wnioski i dalsze kroki', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b11',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's11',
        text: 'Nullam varius, turpis molestie dictum ultrices, erat metus faucibus sapien. Proin commodo eros a erat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; proin vel ante a orci tempus eleifend ut et magna.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'calloutBlock',
    _key: 'cb2',
    type: 'tip',
    text: 'Aby uzyskać szczegółową ofertę lub zadać pytanie, skontaktuj się z naszym działem handlowym pod adresem handel@hydraarms.pl',
  },
  {
    _type: 'block',
    _key: 'b12',
    style: 'blockquote',
    children: [
      {
        _type: 'span',
        _key: 's12',
        text: '„Bezpieczeństwo i zgodność z prawem to fundament każdej transakcji — nie kompromis, lecz standard." — Zarząd Hydra Arms',
        marks: [],
      },
    ],
    markDefs: [],
  },
]

// ─── Listing cards ─────────────────────────────────────────────────────────

export const MOCK_NEWS: PostCardData[] = [
  {
    _id: 'mock-news-1',
    title: 'Hydra Arms uzyskuje nową koncesję MSWiA na obrót bronią sportową',
    slug: 'mock-koncesja-mswia',
    publishedAt: '2026-05-10T09:00:00Z',
    excerpt:
      'Po wielomiesięcznym procesie certyfikacyjnym firma Hydra Arms Sp. z o.o. uzyskała rozszerzone zezwolenie MSWiA obejmujące obrót bronią sportową kategorii B i C na terenie całej UE.',
    tags: ['Koncesja', 'Prawo', 'MSWiA'],
    featured: true,
    href: '/aktualnosci/mock-koncesja-mswia',
  },
  {
    _id: 'mock-news-2',
    title: 'Nowe dostawy amunicji Fiocchi i RWS — magazyn uzupełniony',
    slug: 'mock-dostawy-amunicji',
    publishedAt: '2026-04-28T11:30:00Z',
    excerpt:
      'Do naszego magazynu dotarły nowe partie amunicji od czołowych europejskich producentów. Pełna dostępność w sklepie od 29 kwietnia.',
    tags: ['Amunicja', 'Dostawa', 'Sklep'],
    href: '/aktualnosci/mock-dostawy-amunicji',
  },
  {
    _id: 'mock-news-3',
    title: 'Targi MSPO 2026 — Hydra Arms na stoisku nr 14B',
    slug: 'mock-mspo-2026',
    publishedAt: '2026-04-15T08:00:00Z',
    excerpt:
      'Zapraszamy do odwiedzenia stoiska Hydra Arms podczas Międzynarodowego Salonu Przemysłu Obronnego w Kielcach (9–12 września 2026).',
    tags: ['Targi', 'MSPO', 'B2G'],
    href: '/aktualnosci/mock-mspo-2026',
  },
  {
    _id: 'mock-news-4',
    title: 'Aktualizacja regulaminu sprzedaży — zmiany od 1 czerwca 2026',
    slug: 'mock-regulamin-zmiany',
    publishedAt: '2026-03-30T14:00:00Z',
    excerpt:
      'Z dniem 1 czerwca 2026 roku wchodzą w życie zmiany w Regulaminie Sprzedaży wynikające z nowelizacji ustawy o broni i amunicji.',
    tags: ['Regulamin', 'Prawo', 'Informacja'],
    href: '/aktualnosci/mock-regulamin-zmiany',
  },
  {
    _id: 'mock-news-5',
    title: 'Partnerstwo z dystrybutorem Kobold Defense — nowe kalibry w ofercie',
    slug: 'mock-kobold-defense',
    publishedAt: '2026-03-12T10:00:00Z',
    excerpt:
      'Nawiązaliśmy strategiczne partnerstwo z Kobold Defense GmbH, rozszerzając ofertę o amunicję i akcesoria niedostępne dotychczas na polskim rynku.',
    tags: ['Partnerstwo', 'Kobold Defense', 'Dystrybutor'],
    href: '/aktualnosci/mock-kobold-defense',
  },
  {
    _id: 'mock-news-6',
    title: 'Szkolenie dla klientów instytucjonalnych — rejestracja otwarta',
    slug: 'mock-szkolenie-b2g',
    publishedAt: '2026-02-20T09:00:00Z',
    excerpt:
      'Otwieramy zapisy na zamknięte szkolenie dla klientów sektora publicznego dotyczące procedur przetargowych przy zakupach sprzętu strzeleckiego.',
    tags: ['Szkolenie', 'B2G', 'Przetarg'],
    href: '/aktualnosci/mock-szkolenie-b2g',
  },
]

export const MOCK_BLOG: PostCardData[] = [
  {
    _id: 'mock-blog-1',
    title: 'Jak wybrać pierwszą broń sportową — kompletny przewodnik dla początkujących',
    slug: 'mock-pierwsza-bron-sportowa',
    publishedAt: '2026-05-05T10:00:00Z',
    excerpt:
      'Zakup pierwszej broni to decyzja wymagająca przemyślenia wielu czynników: przeznaczenia, budżetu, ergonomii i wymogów prawnych. Przeprowadzamy Cię krok po kroku.',
    tags: ['Poradnik', 'Początkujący', 'Prawo'],
    featured: true,
    href: '/blog/mock-pierwsza-bron-sportowa',
  },
  {
    _id: 'mock-blog-2',
    title: 'Konserwacja broni długiej — rytuał, który przedłuża życie sprzętu',
    slug: 'mock-konserwacja-broni',
    publishedAt: '2026-04-22T11:00:00Z',
    excerpt:
      'Regularna konserwacja to inwestycja w trwałość i niezawodność broni. Omawiamy najczęstsze błędy, właściwe preparaty i harmonogram przeglądów.',
    tags: ['Konserwacja', 'Techniczny', 'Poradnik'],
    href: '/blog/mock-konserwacja-broni',
  },
  {
    _id: 'mock-blog-3',
    title: 'Porównanie kalibrów 9×19 vs .45 ACP — balistyka, odrzut i zastosowania',
    slug: 'mock-kaliber-9mm-vs-45acp',
    publishedAt: '2026-04-08T09:30:00Z',
    excerpt:
      'Analizujemy twarde dane: prędkość wylotową, energię, penetrację w żelatynie balistycznej i zachowanie w warunkach bojowych.',
    tags: ['Balistyka', 'Kaliber', 'Analiza'],
    href: '/blog/mock-kaliber-9mm-vs-45acp',
  },
  {
    _id: 'mock-blog-4',
    title: 'Prawo o broni w Polsce 2026 — co zmieniło się przez ostatnie dwa lata',
    slug: 'mock-prawo-o-broni-2026',
    publishedAt: '2026-03-18T14:00:00Z',
    excerpt:
      'Nowelizacja ustawy o broni i amunicji z 2025 roku przyniosła zmiany dla posiadaczy broni sportowej i kolekcjonerów. Omawiamy nowe procedury i obowiązki.',
    tags: ['Prawo', 'Ustawa', 'Regulacje'],
    href: '/blog/mock-prawo-o-broni-2026',
  },
  {
    _id: 'mock-blog-5',
    title: 'Optyka taktyczna — jak dobrać lunetę do strzelania długodystansowego',
    slug: 'mock-optyka-taktyczna',
    publishedAt: '2026-02-14T10:00:00Z',
    excerpt:
      'Omawiamy kluczowe parametry: powiększenie, średnicę obiektywu, rodzaj siatki celowniczej i klasy pancerności dla różnych budżetów.',
    tags: ['Optyka', 'Akcesoria', 'Długi dystans'],
    href: '/blog/mock-optyka-taktyczna',
  },
  {
    _id: 'mock-blog-6',
    title: 'Trening suchy — metodyka i narzędzia do doskonalenia techniki bez strzelania',
    slug: 'mock-trening-suchy',
    publishedAt: '2026-01-30T09:00:00Z',
    excerpt:
      'Dry fire to jedna z najefektywniejszych technik treningu strzeleckiego. Jak bezpiecznie przeprowadzać sesje w domu i mierzyć postępy.',
    tags: ['Trening', 'Technika', 'Dry Fire'],
    href: '/blog/mock-trening-suchy',
  },
]

// ─── Detail lookup (keyed by slug) ─────────────────────────────────────────

type DetailMap = Record<string, PostDetailData>

export const MOCK_NEWS_DETAIL: DetailMap = Object.fromEntries(
  MOCK_NEWS.map((p) => [
    p.slug,
    { ...p, body: loremBody },
  ])
)

export const MOCK_BLOG_DETAIL: DetailMap = Object.fromEntries(
  MOCK_BLOG.map((p) => [
    p.slug,
    { ...p, body: loremBody },
  ])
)
