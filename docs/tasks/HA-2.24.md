---
id: HA-2.24
title: Gałęzie ASG, łucznictwo i myślistwo w drzewie kategorii
status: todo
difficulty: S
model: null
model_approved: null
effort: null
branch: null
due: null
depends_on: [HA-2.18, HA-2.17]
blocked_by_questions: [O-20]
touches_db: false
touches_prod: true
pr: null
---

## Cel
ASG, łucznictwo i myślistwo nie mają gałęzi w drzewie 01–15 (ok. 1–2 tys. produktów samego ASG w trzech hurtowniach). Klient w wiadomości z 2026-10-06 traktuje ASG jako towar z odbiorem osobistym. Sukces (po decyzji O-20): drzewo ma nowe gałęzie, mapowanie z feedów je wypełnia, a ASG ma flagę 18+.

## Zakres
- [ ] odczyt stanu bieżącego: `xml-integration/hydra-category-tree.txt`, `hydra-categories.json`, reguły kategorii hurtowni, wynik HA-2.18 i HA-2.17
- [ ] nowe gałęzie w drzewie i w `hydra-categories.json` (kolejne numery, bez zmian istniejących)
- [ ] reguły mapowania Kolba/Sharg/Spechurt dla nowych gałęzi
- [ ] ASG w tabeli reguł HA-2.17 jako 18+ (odbiór)
- [ ] plan zapisu kategorii do BL (`bl-build-categories.ts`) jako instrukcja dla tj

## Gotowe, gdy
- liczby produktów ASG/łucznictwo/myślistwo per hurtownia z dry-runu — **jak sprawdzić:** wklejona tabela
- red proof: produkt ASG nie trafia do działu spoza nowej gałęzi — **jak sprawdzić:** test mapowania na próbkach
- ASG w dry-runie ma tag `age_18` — **jak sprawdzić:** tabela próbki
- zgodność drzewa z BL po zapisie przez tj — **jak sprawdzić:** wynik `bl-verify-categories.ts` (0 rozjazdów)

## Poza zakresem
- zapis kategorii i produktów do BL → tj, bramka STOP
- widoczność kategorii w sklepie → konfiguracja po stronie sklepu (do potwierdzenia, czy BL ma flagę widoczności)

## Bramki STOP
- zapis kategorii do BL (`bl-build-categories.ts`) — tj

## Kontekst
- `xml-integration/hydra-category-tree.txt`, `scripts/bl-build-categories.ts`, `scripts/bl-verify-categories.ts`, `docs/04-open-questions.md` → O-20

## Notatki z realizacji
