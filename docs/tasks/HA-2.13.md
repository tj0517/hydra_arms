---
id: HA-2.13
title: hydra-categories.json w repo i weryfikacja z BaseLinker
status: review
difficulty: S
model: claude-sonnet-4-6
model_approved: null
effort: low
branch: chore/ha-2.13-hydra-categories
due: null
pr: 19
---

# HA-2.13 — hydra-categories.json w repo i weryfikacja z BaseLinker

## Cel

Plik `xml-integration/hydra-categories.json` (mapowanie Hydra num → BL category ID, zbudowany
przez `scripts/bl-build-categories.ts` 2026-07-24) jest tylko na serwerze. Live import wymaga go
w repo. Cel: plik w repo, nowy unit test sprawdzający pokrycie drzewa, read-only skrypt weryfikujący
zgodność z live BaseLinker.

## Zakres

- [x] Analiza `parseTree` vs `parseHydraTreeNumbers` — identyczny zbiór po normNum (205 liczb, 0 różnic)
- [ ] STOP — czeka na scp od tj: `scp hydra-srv:hydra/xml-integration/hydra-categories.json xml-integration/`
- [ ] Commit `xml-integration/hydra-categories.json`
- [ ] Unit test `xml-integration/__tests__/hydra-categories.test.ts`
- [ ] Skrypt `scripts/bl-verify-categories.ts`
- [ ] Smoke test na mock (`BASELINKER_MOCK=true`)
- [ ] Dać tj komendy do live run

## Notatki z realizacji

- 2026-09-25: Parser comparison — `parseTree` (bl-build-categories.ts) i `parseHydraTreeNumbers`
  (hydra-tree-txt.ts) zwracają identyczne 205 liczb z txt po normNum. Brak różnic.
  `getInventoryTags` to read-only metoda BL API (istnieje — nie trzeba STOP na tags).
