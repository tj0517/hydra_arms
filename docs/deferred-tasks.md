# Hydra Arms — odłożone („noticed, not touched”)

Format: data · źródło (zadanie/raport) · co zauważono · propozycja (zadanie / nic).

- 2026-09-22 · wf-plan · środowisko dev (drugi projekt Supabase lub branching, preview Vercela na dev); na razie bez dev (O-02) · wrócić przed startem sprzedaży albo gdy migracje zaczną boleć
- 2026-09-22 · wf-plan · weryfikacja wieku i uprawnień przez mObywatel (O-12) · osobne zadanie, gdy klient zdecyduje
- 2026-09-22 · wf-plan · automatyczne anulowanie niezapłaconych zamówień po czasie · po HA-2.03, jeśli zaczną się zbierać
- 2026-09-22 · wf-plan · kolumna `source_connectors.xml_url` może być zbędna, skoro adresy feedów idą z env · ewentualnie usunięcie kolumny po HA-1.02 (decyzja tj, bramka STOP: drop kolumny)
- 2026-09-22 · wf-plan · zrzuty ekranu `*.png` w korzeniu `web/` (ok. 30 plików) zaśmiecają repo · przenieść do `.playwright-mcp/` lub usunąć (decyzja tj)
- 2026-09-22 · wf-plan · `legal/*.docx` nieśledzone w git (regulamin usług, polityka prywatności) · wykorzystać w HA-2.08; zdecydować, czy trzymać w repo
- 2026-09-22 · wf-plan · API kurierów (etykiety, tracking), maile o wysyłce/dostawie, zwroty przez P24 · etap 3, po O-10
- 2026-09-22 · wf-plan · konfiguracja zaplecza zamówień i e-paragonów w BaseLinkerze (O-14, O-16) · praca w BL, nie w repo; punkt runbooka HA-2.09
- 2026-09-22 · HA-1.01 · migracja `004_xml_import_fields.sql` seeduje `source_connectors` prawdziwymi tokenami Sharg i kluczem Spechurt wprost w SQL — tokeny są więc trwale w historii gita repo, nie tylko w danych tabeli · rotacja tokenów + usunięcie z pliku migracji, decyzja tj przy HA-1.02
- 2026-09-22 · HA-1.01 · pusta tabela historii migracji na prod (`list_migrations` → `[]`) — 001–007 wdrożone ręcznie, CLI nie wie co już zastosowano · `supabase migration repair` potrzebny przed jakimkolwiek przyszłym `db push`; to zapis, poza zakresem tego zadania
- 2026-09-22 · HA-1.01 · RLS na `source_connectors` włączone ręcznie na prod, żadna migracja 001–007 tego nie robi — przy odtworzeniu bazy od zera (HA-1.06) RLS by nie wróciło · dopisać `ENABLE ROW LEVEL SECURITY` do właściwej migracji, decyzja tj
