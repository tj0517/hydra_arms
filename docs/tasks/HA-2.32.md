---
id: HA-2.32
title: Header sklepu — stały link Sklep, wyszukiwarka w headerze na /sklep, breadcrumby na PDP, naprawa CTA „Sklep” na home
status: in_progress
difficulty: S
model: claude-fable-5-1
model_approved: null
effort: null
branch: feat/ha-2.32-shop-header
due: null
depends_on: [HA-2.30]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
Na stronach `/sklep/*` nawigacja zamienia link „Sklep” na „Zaloguj / Zarejestruj”, więc z karty produktu wraca się tylko przez „← Powrót do sklepu”; nie ma breadcrumbów ani wyszukiwarki poza toolbarem listingu, a CTA „Sklep” na stronie głównej ma `href="#"`. Sukces: ze strony produktu zawsze widać, gdzie się jest (Sklep › kategoria › podkategoria) i da się od razu szukać lub wrócić do kategorii; strona główna prowadzi do sklepu.

## Zakres
- [ ] odczyt stanu bieżącego: `src/components/Nav.tsx` (gałąź `isShop`, `FLAT_LINKS`, menu mobilne), `HomePageClient.tsx` (CornerCTA „Sklep” z `href="#"`), `ProductDetailClient.tsx` (nagłówek „← Powrót do sklepu”), `sklep/[id]/page.tsx` (dostęp do `categories`)
- [ ] `Nav.tsx`: link „Sklep” widoczny zawsze (desktop i mobile), obok niego Zaloguj/Zarejestruj/Konto na `/sklep/*`; zmiana ograniczona do listy linków, bez przebudowy animacji
- [ ] wyszukiwarka w headerze na `/sklep*`: pole prowadzące na `/sklep?q=<fraza>` (ten sam parametr co listing, HA-2.30); na mobile ikona rozwijająca pole
- [ ] `Breadcrumbs` na PDP: Sklep › <korzeń> › <podkategoria> › <nazwa produktu>, etykiety przez `categoryDisplayName`, linki do `/sklep?cat=<id>`; korzeń „00.” → tylko „Sklep › produkt”; JSON-LD `BreadcrumbList`
- [ ] home: CornerCTA „Sklep” → `/sklep`
- [ ] test: breadcrumb na PDP produktu z kategorią z seedu, link „Sklep” w nav na `/sklep/<id>`, szukaj z headera → URL `?q=`

## Gotowe, gdy
- na `/sklep/<id>` w nawigacji jest link „Sklep” (desktop i menu mobilne) — **jak sprawdzić:** test w `product-detail.spec.ts` (`getByRole('link', { name: 'Sklep' })` widoczny na obu viewportach)
- breadcrumb na PDP pokazuje ścieżkę kategorii bez prefiksów numerycznych i linkuje do `/sklep?cat=<id>`; produkt z „00.” ma tylko „Sklep › produkt” — **jak sprawdzić:** test na produktach z seedu (12002 i „00.”) + `grep -rn "BreadcrumbList" src` (JSON-LD obecny)
- szukaj z headera na `/sklep/<id>` przenosi na `/sklep?q=<fraza>` i listing ma frazę w chipie — **jak sprawdzić:** test Playwright
- CTA „Sklep” na stronie głównej prowadzi do `/sklep` — **jak sprawdzić:** `grep -n 'label="Sklep"' src/components/HomePageClient.tsx` pokazuje `href="/sklep"`
- strona firmowa poza `/sklep` renderuje się jak dotąd — **jak sprawdzić:** zrzut `/` i `/uslugi` desktop przed/po (nav identyczny poza dodanym linkiem), `npm run build` bez błędów

## Poza zakresem
- mega-menu kategorii w headerze → po listingu server-side i stronach kategorii
- przebudowa `Nav.tsx` (animacje ScrambleLink, logika scrolled) → nie w tym zadaniu
- strona listingu i karta → HA-2.30 / HA-2.31

## Bramki STOP
- przed zmianą w `Nav.tsx` — pokaż diff listy linków i zrzut nav na `/` oraz `/sklep/<id>` (desktop + mobile); `Nav` jest wspólny dla całej strony firmowej

## Kontekst
- `src/components/Nav.tsx`, `src/components/HomePageClient.tsx`, `src/components/ui/CornerCTA.tsx`
- `src/components/shop/ProductDetailClient.tsx`, `src/app/(main)/sklep/[id]/page.tsx`
- `src/lib/shop/categoryLabel.ts` (HA-2.30)
- `tests/shop/product-detail.spec.ts`

## Notatki z realizacji
- 2026-10-19 tj (wf-plan): header osobno od listingu (D3), żeby zmiana w `Nav.tsx` strony firmowej szła własnym małym PR-em.
- 2026-10-20 tj: kryterium „strona firmowa jak dotąd” sprawdzane listą linków nav (label + href, desktop i menu mobilne) na `/` i `/uslugi` wobec bazy z `origin/main` (`tests/shop/__fixtures__/nav-links.json`), nie pikselowym diffem — nav ma animacje scramble/GSAP, dwa zrzuty tego samego stanu się różnią.
- 2026-10-20 tj: zgoda na zmianę `Nav.tsx` dokładnie wg propozycji — `[ Sklep ]` renderowany zawsze, gałąź `isShop` tylko dla Zaloguj/Zarejestruj/Konto, `HeaderSearch` montowany tylko na `/sklep*`, bez zmian w ScrambleLink, logice scrolled i burgerze.
- 2026-10-20 tj (D1 → A): szukaj z headera, gdy użytkownik już jest na `/sklep` — listing czyta `?q=` tylko przy montowaniu, więc listing jest przemontowywany przez `key` zależny od `q` w `src/app/(main)/sklep/page.tsx` (jednorazowa zgoda na dotknięcie tego pliku w tym jednym miejscu; `SklepClient.tsx` i semantyka wyszukiwania nietknięte).
- 2026-10-20 tj (D2 → A): eyebrow kategorii nad tytułem PDP zostaje obok breadcrumba (duplikat ścieżki) — konsolidacja w przyszłym przejściu PDP, zapis w `docs/deferred-tasks.md`.
