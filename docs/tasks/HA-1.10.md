---
id: HA-1.10
title: Poprawki React — 10 wyłączonych reguł lint (efekty, czystość renderu, komponenty w renderze)
status: todo
difficulty: M
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-1.06, HA-1.07]
blocked_by_questions: []
touches_db: false
touches_prod: false
pr: null
---

## Cel
W HA-1.07 CI włączyło lint, ale 10 istniejących błędów React zostało wyciszonych pojedynczymi `eslint-disable-next-line` (decyzja tj 2026-09-22, opcja B). Część z nich to realne usterki: `setState` wywoływany synchronicznie w efekcie (zbędne podwójne renderowanie, migotanie), nieczyste wywołania w trakcie renderu (animacje w `TacticalReadout`) i komponenty tworzone w każdym renderze w `SklepClient` (reset stanu i focusu w sklepie). Sukces: wszystkie 10 miejsc naprawione, zero wyłączeń reguł w kodzie, strony i sklep działają jak wcześniej.

## Zakres
- [ ] odczyt stanu bieżącego: `grep -rn "eslint-disable-next-line" src` (lista z deferred, wpis HA-1.07), zachowanie każdego komponentu przed zmianą
- [ ] `react-hooks/set-state-in-effect` ×5: `src/components/LoadingScreen.tsx`, `src/components/Nav.tsx`, `src/components/shop/CheckoutClient.tsx`, `src/lib/GraphicsCapabilityContext.tsx`, `src/sanity/components/ProductPickerInput.tsx`
- [ ] `react-hooks/purity` ×3: `src/components/TacticalReadout.tsx`
- [ ] `react-hooks/static-components` ×2: `src/components/shop/SklepClient.tsx`
- [ ] usunięcie wszystkich 10 `eslint-disable-next-line` i wpisu w `docs/deferred-tasks.md`
- [ ] zrzuty Playwright (przed/po) dla zmienionych ekranów: strona główna (LoadingScreen, Nav, TacticalReadout), sklep (SklepClient), checkout (CheckoutClient)

## Gotowe, gdy
- `grep -rn "eslint-disable" src` pusto — **jak sprawdzić:** wklejone wyjście
- `npm run lint` → 0 błędów, `npx tsc --noEmit` → 0 błędów, CI zielone — **jak sprawdzić:** wklejone wyjście + link do przebiegu CI
- zachowanie bez zmian: animacje, nawigacja, filtrowanie sklepu, formularz checkoutu — **jak sprawdzić:** zrzuty Playwright przed/po w `.playwright-mcp`, ścieżki w raporcie; checkout na lokalnej bazie (HA-1.06), nigdy na prod
- `SklepClient`: filtr/wyszukiwanie nie traci focusu ani stanu po wpisaniu znaku — **jak sprawdzić:** krótki scenariusz Playwright lub zrzut z opisem kroków

## Poza zakresem
- inne ostrzeżenia lint (34 warnings, pre-existing) → osobne zadanie, jeśli tj zechce
- przebudowa animacji GSAP poza wymaganą poprawką czystości renderu

## Bramki STOP
- przed zmianą zachowania widocznego dla użytkownika (np. inna kolejność animacji, inny moment pojawienia się elementu) — pokaż zrzuty przed/po i czekaj na akceptację
- checkout testowany wyłącznie na lokalnej bazie; guard z HA-1.05 blokuje Playwright na prod

## Kontekst
- `docs/deferred-tasks.md` — wpis HA-1.07 z listą 10 linii
- `docs/tasks/HA-1.07.md` — notatki z decyzją o wyłączeniach
- `REFACTOR_PLAN.md`, `COLORS.md` — spójność UI

## Notatki z realizacji
- 2026-09-22 tj: zadanie wydzielone z HA-1.07 (opcja B: 26 błędów mechanicznych naprawionych, 10 wyciszonych do naprawy tutaj)
