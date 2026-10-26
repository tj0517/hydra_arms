# Serwer importu — wdrożenie i obsługa

Zadanie: `docs/tasks/HA-2.15.md`. Serwer `hydra-srv` (51.83.134.183) pobiera feedy trzech hurtowni
i zapisuje produkty, stany i ceny do katalogu BaseLinkera klienta. Robi to tutaj, a nie na
Vercelu, bo feedy są duże, a Spechurt odpowiada tylko temu adresowi IP.

Wszystkie kroki na serwerze wykonuje tj. Agent nie łączy się z serwerem i nie zapisuje do
BaseLinkera: pisze komendy, a tj wkleja wyniki.

Kolejność: 1 konto → 2 klon → 3 zależności → 4 plik env → 5 wrapper → 6 podgląd i pamięć →
7 harmonogram → 8 pierwszy import → 9 pierwszy sync → 10 crontab → 11 porządki.

## Zasady

- **Sekrety.** W repo i w tej instrukcji są same nazwy zmiennych. Nie wklejaj nigdzie wartości
  tokenów ani pełnych adresów feedów. Zanim wkleisz jakikolwiek log, policz
  `grep -cE 'key=|token=' <plik>` — ma wyjść `0`. Jeśli nie wychodzi, wklej samą liczbę.
- **Zapis do BaseLinkera** (`import`, `sync`) dzieje się wyłącznie na serwerze, po bramce STOP.
- **Podgląd** (`--dry-run`) niczego nie zapisuje i nie wymaga odblokowania prod.
- **STOP** w tekście znaczy: wklej wynik i poczekaj na odpowiedź, zanim pójdziesz dalej.
- **Konto.** Każdy blok komend ma nad sobą etykietę: `ubuntu`, `hydra-import` albo `Mac`. Na
  serwer wchodzisz zawsze jako `ubuntu` (`ssh hydra-srv`), a na konto importu przez
  `sudo -iu hydra-import` — przed blokiem sprawdź `whoami`. Na koncie `ubuntu` katalog `~/hydra`
  to stary klon z lipca, a `~/.hydra-run-bl.lock` nie jest blokadą importu.

## Stan wyjściowy (odczyt 2026-10-13, 11:29 UTC)

| Co | Stan |
|---|---|
| System | Ubuntu 26.04 LTS, host `vps-4d70e465`, strefa `Etc/UTC` |
| Konta | tylko `ubuntu` (sudo bez hasła); dedykowanego konta nie było |
| Node | `/usr/bin/node` v20.20.2, npm 10.8.2; domyślny limit sterty 1956 MB |
| Pamięć, dysk | RAM 3814 MB, swapu brak, 2 rdzenie; 31 GB wolne; `/tmp` to pamięć RAM (1,9 GB) |
| Narzędzia | `flock`, `/usr/bin/time`, `tmux` są; niczego nie trzeba doinstalować |
| Cron | usługa działa, crontaba nie było |
| Stary klon | `/home/ubuntu/hydra` na `f20a13d` (lipiec), nieśledzone `xml-integration/hydra-categories.json` i `scripts/count-adhoc.ts` |
| Stary plik env | `/home/ubuntu/hydra/.env.local`, tryb 644; identyfikatory BaseLinkera z sandboxa (zgodność z kontem klienta 0 z 6), do tego klucze Supabase (service role), Sanity i Resend |
| Stare pliki | `~/spechurt.xml`, `~/spechurt-2026-09-26.xml`, `~/spechurt-import.log` (1 linia z kluczem) |

Stary klon i stary plik env zostają nietknięte do porządków (krok 11). Import powstaje obok, na
nowym koncie.

## 1. Konto `hydra-import`

Decyzja tj 2026-10-13 (O-19, opcja B): import działa na własnym koncie bez sudo i bez logowania
przez SSH. Proces importu i pakiety npm nie widzą wtedy katalogu `ubuntu` ani nie mogą nic zrobić
jako root.

`ubuntu`:

```bash
sudo adduser --disabled-password --comment "Hydra import" hydra-import
getent passwd hydra-import                    # katalog /home/hydra-import, powłoka /bin/bash
sudo -l -U hydra-import                       # oczekiwane: „… is not allowed to run sudo …”
sudo -u hydra-import ls /home/ubuntu          # oczekiwane: Permission denied
sudo -iu hydra-import                         # wejście na konto; wyjście: exit
```

## 2. Klon repo

Do czasu merge PR-a z HA-2.15 serwer stoi na gałęzi zadania (decyzja tj 2026-10-13): wrapper i jego
test są na razie tylko tam. Skrypt importu na tej gałęzi jest taki sam jak na `main`.

Repo jest publiczne, więc klon idzie po HTTPS i konto nie potrzebuje żadnego klucza do GitHuba.

`hydra-import`:

```bash
cd /home/hydra-import
git clone --branch feat/ha-2.15-import-server https://github.com/tj0517/hydra_arms.git hydra
cd /home/hydra-import/hydra
git status -sb | head -3                      # ## feat/ha-2.15-import-server...origin/…
git log -1 --format='%h %ci %s'
git ls-remote origin feat/ha-2.15-import-server | cut -c1-7     # ten sam skrót co wyżej
grep -c 89265 xml-integration/hydra-categories.json            # 0 — nie ma ID z sandboxa
node -e 'const j=require("./xml-integration/hydra-categories.json");const v=Object.values(j);console.log(Object.keys(j).length,"kluczy; ID od",Math.min(...v),"do",Math.max(...v))'
# oczekiwane: 206 kluczy; ID od 9755703 do 9755909
```

Dlaczego świeży klon, a nie stary: klon z lipca nie ma filtra asortymentu P1, tagów pozwoleń,
reguł Sharga, bezpiecznika prod w skrypcie ani wrappera, a jego `hydra-categories.json` zawiera
identyfikatory kategorii z sandboxa (8926520–8926732), których nie ma na koncie klienta. Import
ze starego klonu wpisałby produkty bez filtra i z nieistniejącymi kategoriami.

### Aktualizacja kodu

Po merge PR-a — i tak samo przy każdej późniejszej zmianie kodu, wtedy bez `git switch main`.
Aktualizacja bierze tę samą blokadę co import, więc cron nie wystartuje w połowie `npm ci`.

`hydra-import`:

```bash
cd /home/hydra-import/hydra
flock -n /home/hydra-import/.hydra-run-bl.lock bash -c 'git fetch origin && git switch main && git pull --ff-only && npm ci'; echo "exit=$?"
# exit=1 od razu, bez żadnego wypisu = trwa import albo sync; spróbuj później
git log -1 --format='%h %ci %s'
scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"     # CHECK ok, exit=0
```

Ścieżki w crontabie się nie zmieniają.

## 3. Zależności

`hydra-import`:

```bash
cd /home/hydra-import/hydra
node -v                                       # v20.20.2
npm ci                                        # pełna instalacja, kilka minut
test -x node_modules/.bin/tsx && node_modules/.bin/tsx --version
```

Pełna instalacja jest konieczna — bez `--omit=dev` i bez `NODE_ENV=production`: `tsx` i `dotenv`,
których używa skrypt importu, nie są wpisane wprost do `package.json`, tylko przychodzą razem
z narzędziami Sanity. Nowych pakietów nie dodajemy. `flock` (util-linux) i `/usr/bin/time` już są
w systemie; gdyby `time` kiedyś zniknął: `sudo apt install time`.

## 4. Plik env

Skrypt importu czyta jeden plik: `.env.local` w katalogu repo, z którego startuje. Wartości
z pliku wygrywają ze zmiennymi otoczenia. Plik należy do `hydra-import` i ma tryb `600`.

Zmienne, których potrzebuje import — **same nazwy**:

| Zmienna | Do czego |
|---|---|
| `BASELINKER_TOKEN` | dostęp do API BaseLinkera — token **konta klienta** |
| `BASELINKER_INVENTORY_ID` | katalog docelowy: `119068` („Hydra arms”) |
| `BASELINKER_PRICE_GROUP` | grupa „Cena sprzedaży” |
| `BASELINKER_PRICE_GROUP_PURCHASE` | grupa „Cena zakupu” (bez niej ceny zakupu nie są zapisywane) |
| `BASELINKER_WAREHOUSE_H1` | magazyn Kolby, format `bl_<id>` |
| `BASELINKER_WAREHOUSE_H2` | magazyn Sharga |
| `BASELINKER_WAREHOUSE_H3` | magazyn Spechurtu |
| `BASELINKER_MARKUP_KOLBA` | marża w procentach od ceny zakupu, sama liczba: `30` to cena zakupu + 30 % (nie `0.3`; ułamek z kropką) |
| `BASELINKER_MARKUP_SHARG` | jw. |
| `BASELINKER_MARKUP_SPECHURT` | jw. |
| `BASELINKER_EXTRA_FIELD_MARGIN` | ID pola dodatkowego „Marża %” (HA-2.22), sama liczba. Pusta albo brak = marża zawsze z env. Dopisujesz dopiero po bramce z sekcji „Marża ręczna (HA-2.22)” |
| `SPECHURT_KEY` | klucz feedu Spechurtu |
| `SHARG_CLIENT` | identyfikator klienta w adresie feedu Sharga |
| `SHARG_TOKEN_FULL` | token pełnego feedu Sharga |
| `SHARG_TOKEN_GATEWAY` | token manifestu Sharga (parametry produktów) |
| `SHARG_TOKEN_LIGHT` | kod buduje z niej adres feedu „light”, ale obecny import go nie pobiera — można pominąć (wtedy niżej wychodzi 14 nazw, nie 15) |

Identyfikatory konta klienta (katalog, grupy cen, magazyny) są w notatkach `docs/tasks/HA-2.26.md`
i przy O-33 w `docs/04-open-questions.md`. Marża wstępna to 30 % (O-07, HA-2.05), o ile tj nie
poda innej.

Czego w pliku **nie może być**:

- `HA_ALLOW_PROD` — odblokowanie zapisu podaje się tylko na jedno uruchomienie (sekcja
  „Odblokowanie prod”); wrapper odmawia pracy, gdy znajdzie tę linię;
- `BASELINKER_MOCK` — z wartością `true` import udaje zapis i raportuje sukces; wrapper odmawia;
- `BASELINKER_WAREHOUSE_HYDRA` — puste do HA-2.09; linii nie wpisuj wcale, bo pusta wartość
  przerywa podgląd błędem;
- kluczy Supabase, Sanity, Przelewy24, Resend, `SYNC_SECRET`, `CRON_SECRET` ani zmiennych zamówień
  (`BASELINKER_ORDER_SOURCE_ID`, `BASELINKER_STATUS_*`) — import ich nie czyta.

`NEW_SUBCATEGORY_DEFAULT_PRIORITY` też tu nie wpisujemy: filtr asortymentu czyta ją, zanim plik
zostanie wczytany, więc z pliku najpewniej by nie zadziałała (wpis w deferred).

**Uwaga na katalog.** Gdy brakuje `BASELINKER_INVENTORY_ID`, skrypt importu bierze domyślnie
katalog `35743` — żywy katalog klienta „Kobold Defense”. Wrapper nie wystartuje, gdy zmiennej
brakuje albo wskazuje inny katalog niż znacznik serwera (krok 8), ale komenda wpisana ręcznie,
z pominięciem wrappera, tej ochrony nie ma.

### Przeniesienie wartości

Źródłem jest `.env.local` na Macu tj (tam są identyfikatory konta klienta, zapisane w HA-2.26).
Plik pośredni zawiera tylko linie z listy wyżej; niczego nie wypisuje na ekran.

`Mac`, w katalogu repo. Komendy w tym bloku nie mają komentarzy po `#`, bo domyślny zsh na macOS
nie rozpoznaje ich w wierszu poleceń:

```bash
umask 077
grep -E '^(BASELINKER_TOKEN|BASELINKER_INVENTORY_ID|BASELINKER_PRICE_GROUP|BASELINKER_PRICE_GROUP_PURCHASE|BASELINKER_WAREHOUSE_H[123]|BASELINKER_MARKUP_(KOLBA|SHARG|SPECHURT)|SPECHURT_KEY|SHARG_CLIENT|SHARG_TOKEN_(FULL|GATEWAY|LIGHT))=' .env.local > ~/hydra-import.env
grep -oE '^[A-Z][A-Z0-9_]*=' ~/hydra-import.env | sort | uniq -c
```

Oczekiwane: 15 linii, każda z liczbą `1`. Jeśli któraś nazwa wychodzi dwa razy albo której
brakuje, popraw `~/hydra-import.env` w edytorze i powtórz ostatnią komendę (przy powtórzeniu
wygrywa ostatnia linia). Plik wysyłasz dopiero, gdy lista jest dobra.

`Mac`:

```bash
scp ~/hydra-import.env hydra-srv:hydra-import.env && rm ~/hydra-import.env
```

`ubuntu`:

```bash
sudo install -o hydra-import -g hydra-import -m 600 ~/hydra-import.env /home/hydra-import/hydra/.env.local
rm ~/hydra-import.env
```

### Sprawdzenie bez wypisywania sekretów

`hydra-import`:

```bash
E=/home/hydra-import/hydra/.env.local
stat -c '%a %U:%G' "$E"                                    # 600 hydra-import:hydra-import
grep -oE '^[A-Z][A-Z0-9_]*=' "$E" | sort | uniq -c         # 15 nazw z tabeli, każda raz
grep -cvE "^[A-Z][A-Z0-9_]*=([^[:space:]#\"']|\"[^\"]|'[^'])|^[[:space:]]*#|^[[:space:]]*\$" "$E"   # 0 — brak pustych wartości i obcych linii
grep -oE "^[A-Z][A-Z0-9_]*=[[:space:]]*(\"\"|'')?[[:space:]]*(#|\$)" "$E" | cut -d= -f1               # nic; jeśli coś wypisze — to nazwy bez wartości
for kv in BASELINKER_INVENTORY_ID=119068 BASELINKER_PRICE_GROUP=104511 BASELINKER_PRICE_GROUP_PURCHASE=104512 BASELINKER_WAREHOUSE_H1=bl_157483 BASELINKER_WAREHOUSE_H2=bl_157484 BASELINKER_WAREHOUSE_H3=bl_157485; do
  printf '%s : %s\n' "$kv" "$(grep -cE "^${kv%%=*}=[\"']?${kv#*=}[\"']?[[:space:]]*(#.*)?\$" "$E")"
done                                                        # sześć razy „: 1”
grep -cE '=["'"'"']?(107789|bl_14860[234])' "$E"            # 0 — nic z sandboxa
grep -E '^BASELINKER_MARKUP_(KOLBA|SHARG|SPECHURT)=' "$E"   # trzy linie — marża nie jest sekretem, wklej je
```

Pusta wartość to także `NAZWA=      # komentarz` (tak wyglądają niewypełnione linie
z `.env.local.example`), same spacje po `=` oraz `""` i `''` — import czyta je wszystkie jako
puste. Jeśli któreś sprawdzenie nie daje oczekiwanego wyniku, popraw plik (`nano "$E"`, wartość
zaraz po `=`, bez spacji) i powtórz cały blok. Pustą linię `SHARG_TOKEN_LIGHT` po prostu usuń.

Marże to jedyne wartości z tego pliku, które pokazujesz. Od nich zależy każda cena sprzedaży
zapisana przez import i sync, a podgląd z kroku 6 ich nie pokazuje — akceptujesz je razem
z podglądem.

Zgodności tokena nie da się sprawdzić bez wypisania go — potwierdzi ją dopiero pierwszy import
(BaseLinker odrzuci zapis do katalogu, którego token nie widzi).

## 5. Wrapper i jego samosprawdzenie

Cron i ręczne uruchomienia importu idą przez `scripts/server/run-bl.sh <hurtownia> <tryb>`
(`kolba|sharg|spechurt`, `import|sync`). Wrapper:

- trzyma jedną blokadę (`flock -n`) na cały serwer — gdy trwa inne uruchomienie, nowe kończy się
  od razu kodem 0 i linią `SKIP` w dzienniku;
- pisze osobny log na każde uruchomienie i dziennik miesięczny (sekcja „Logi”);
- podaje odblokowanie prod wyłącznie procesowi importu;
- przed startem sprawdza konfigurację i odmawia (kod 78, linia `ERROR` w dzienniku i na stderr),
  gdy: nie ma znacznika `~/.hydra-import-server` albo znacznik nie podaje katalogu, katalog
  w `.env.local` jest inny niż w znaczniku, nie ma `.env.local` albo nie da się go przeczytać,
  plik zawiera `HA_ALLOW_PROD`, ma `BASELINKER_MOCK` ustawione na `true`, nie ma `tsx` albo `node`,
  albo uruchamia go sesja agenta AI (zmienna `CLAUDECODE`);
- przy prawdziwym uruchomieniu niczego o celu nie bierze z otoczenia: repo to katalog, w którym
  leży wrapper, a znacznik i blokada są w katalogu domowym konta;
- uruchamia import we własnej grupie procesów: sygnał wysłany do wrappera (albo limit czasu
  `HYDRA_MAX_SECONDS`) zatrzymuje cały import, a linia `END` powstaje dopiero, gdy nie zostaje po
  nim żaden proces.

`hydra-import`:

```bash
cd /home/hydra-import/hydra

# a) Samosprawdzenie wrappera. Bezpieczne: tylko komendy zastępcze w katalogu tymczasowym.
bash scripts/server/test-run-bl.sh | tail -n 3          # passed: 82, failed: 0

# b) Red proof znacznika: bez znacznika wrapper odmawia i niczego nie uruchamia.
scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"
#    … ERROR this machine is not marked as the import server … ; exit=78
```

Wklej wyniki a) i b). Znacznika jeszcze nie zakładasz: powstaje dopiero w kroku 8, po zgodzie na
pierwszy import. Do tego czasu wrapper nie zapisze niczego, nawet uruchomiony przez pomyłkę.

## Logi

Katalog `/home/hydra-import/logs` (tryb 700, pliki 600):

| Plik | Co zawiera |
|---|---|
| `<hurtownia>-<tryb>-<RRRRMMDD-GGMMSS>.log` | pełne wyjście jednego uruchomienia; pierwsza i ostatnia linia od wrappera (start; koniec z kodem wyjścia i czasem) |
| `run-bl-<RRRR-MM>.log` | dziennik: jedna linia na `START`, `END`, `SKIP`, `STOP`, `ERROR`, `WARN` |
| `preview-<hurtownia>.log` | podglądy uruchamiane ręcznie (krok 6) |

Czasy w logach, w dzienniku i w nazwach plików są polskie (`+0200` latem, `+0100` zimą), choć
zegar serwera chodzi w UTC: wrapper uruchamia import w strefie Europe/Warsaw, bo BaseLinker
podaje koniec blokady limitu zapytań w czasie polskim. Dlatego komendy niżej biorą najnowszy
dziennik, zamiast zgadywać miesiąc z zegara serwera.

Rotacja (decyzja tj 2026-10-13): wrapper przy starcie kasuje własne pliki starsze niż 30 dni —
tylko te o dokładnie jego nazwach: `<hurtownia>-<import albo sync>-<8 cyfr>-<6 cyfr>.log` oraz
`run-bl-<RRRR-MM>.log`. Niczego innego w `~/logs` nie rusza; podglądy i własne notatki usuwasz
ręcznie. Inną retencję ustawia `HYDRA_LOG_KEEP_DAYS` w crontabie (liczba całkowita).

`hydra-import`:

```bash
J="$(ls -t ~/logs/run-bl-*.log | head -n 1)"              # najnowszy dziennik
tail -n 20 "$J"                                           # co się działo ostatnio
grep -E 'ERROR|WARN|STOP|exit=[1-9]|[1-9][0-9]* errors|result="(none|Nothing to|Matched 0 |Import done: 0 created, 0 updated)' ~/logs/run-bl-*.log
# ↑ wszystko, co nie poszło gładko — także przy exit=0: błędy produktów, pusty feed, sync bez trafień
grep -cE 'key=|token=' ~/logs/*.log                       # 0 przy każdym pliku
```

Jak czytać dziennik:

```
… sharg import pid=4242 START catalogue=119068 commit=abc1234 limit=none log=/home/hydra-import/logs/sharg-import-20261014-020001.log
… sharg import pid=4242 END exit=0 duration=1820s url-credentials=0 result="Import done: 2280 created, 0 updated, 0 errors, skipped: 0" log=…
… sharg sync pid=4311 SKIP lock held by another run — skipping (holder: sharg import pid=4242 since …, running 12 min)
```

- `result="…"` to podsumowanie samego importu, przepisane z logu. Kod `exit=0` nie wystarcza:
  import kończy się zerem także wtedy, gdy część produktów się nie zapisała, feed był pusty albo
  sync niczego nie dopasował. Przy `exit=0` możliwe wartości to: `Import done: N created,
  M updated, K errors, skipped: S`, `Sync done: N products refreshed`, `Matched 0 products, N not in BL yet`
  (sync nie znalazł w katalogu żadnego produktu z feedu) oraz `Nothing to import.` /
  `Nothing to sync.` (feed dał 0 produktów). `result="none"` znaczy, że w logu nie ma żadnej
  z tych linii — import został przerwany przed podsumowaniem.
- `Sync done: N products refreshed, zeroed: Z (approved: A)` (od HA-2.38) — sync ustawił stan 0
  w magazynie tej hurtowni na `Z` rekordach z jej kodem, których nie ma w dzisiejszym feedzie
  (`A` z nich ma tag `approved`, czyli znikają ze sklepu). Przy pierwszym przebiegu hurtowni po
  wdrożeniu `zeroed: 0` — sync dopiero zapisuje licznik produktów (sekcja „Wycofane produkty”).
- `prices skipped (not a member): N` (od HA-2.38) — linia pod `Sync done`: rekordy innej hurtowni, które sync
  trafił przez EAN, a których ta hurtownia nie jest członkiem (prefiks SKU albo parametr `SKU <Hurtownia>`).
  Dostały tylko stan w magazynie tej hurtowni, bez ceny — cenę pisze właściciel rekordu. Ostrzeżenia BL
  z zapisu stanów i cen trafiają do logu z treścią: `[warn] BL prices warning, product <id>: …` (do 50 na
  przebieg).
- `skipped: S` (od HA-2.28) to produkty dopasowane do katalogu, dla których BaseLinker nie
  oddał danych (tagów, SKU, parametrów) — import ich nie nadpisał, tylko pominął; każdy
  taki produkt jest już wliczony w `K errors`, więc `[1-9][0-9]* errors` z grepa wyżej je łapie.
- `url-credentials=N` to liczba linii logu wyglądających na adres z danymi dostępowymi.
  Oczekiwane `0`. Przy innej wartości wrapper dopisuje `WARN` — przeczytaj log, a potem go usuń
  (decyzja tj 2026-10-13: wrapper tylko wykrywa, niczego nie zamazuje).
- `stopped-by=…` — uruchomienie zatrzymane limitem czasu albo sygnałem; `killed-by-signal=9` —
  proces zabity z zewnątrz, najczęściej przez system z braku pamięci.
- `what=stand-in` — uruchomienie z komendą zastępczą (`--cmd`), nie import.

Plik blokady to `/home/hydra-import/.hydra-run-bl.lock`; kto ją trzyma, mówi
`/home/hydra-import/.hydra-run-bl.lock.holder`. Żaden z nich nie leży w `~/logs`, więc sprzątanie
logów nie zdejmie blokady.

Pod cronem wrapper nic nie wypisuje, gdy uruchomienie się udało albo zostało pominięte; odmowy
i nieudane uruchomienia wypisuje na stderr, więc cron może je zgłosić. Uruchomiony ręcznie
w terminalu powtarza na ekranie każdą linię dziennika. Innych powiadomień nie ma (monitoring jest
w deferred).

## 6. Podgląd i pomiar pamięci

Podgląd pobiera prawdziwy feed, liczy przyjęte i odrzucone produkty i niczego nie zapisuje.
Zaczynamy od Sharga, bo ma największy feed. Serwer ma 3,8 GB RAM, nie ma swapu, a Node domyślnie
pozwala na 1956 MB sterty.

`hydra-import`:

```bash
mkdir -p ~/logs && chmod 700 ~/logs
cd /home/hydra-import/hydra
P=~/logs/preview-sharg.log
/usr/bin/time -v npx tsx scripts/xml-to-baselinker.ts sharg --dry-run > "$P" 2>&1; echo "exit=$?"
grep -cE 'key=|token=' "$P"                   # musi być 0, zanim cokolwiek wkleisz
grep -E '^(Received|Parsed)|Defence filter|no category mapping|permit (tags|groups)' "$P"
sed -n '/DRY-RUN SUMMARY/,$p' "$P"            # pusto = podgląd nie doszedł do podsumowania
grep -E '\[(fatal|error)\]|heap out of memory|^Command (exited|terminated)|Elapsed \(wall clock\)|Maximum resident set size' "$P"
```

Wynik idzie do pliku, a nie na ekran, żeby `grep -c` dało się policzyć przed pokazaniem treści.

Co odczytać:

- **liczby**: `feed: N admitted: A dropped: D`, powody odrzucenia (`no_stock`, `not_p1`),
  `no category mapping`, tabela `Admitted by Hydra section`;
- **szczyt pamięci**: linia `Maximum resident set size (kbytes)` z wyjścia `time`. To największy
  pojedynczy proces (Node ze skryptem); procesy pośrednie `npx` i `tsx` dokładają ok. 150 MB;
- **czas**: `Elapsed (wall clock) time`;
- **gdy `exit` nie jest 0 albo trzecia komenda nic nie wypisała**: podgląd nie doszedł do
  podsumowania. Przyczynę, czas i szczyt pamięci pokazuje czwarta komenda, która od podsumowania
  nie zależy: linia `[fatal] …` albo `[error] …`, `… JavaScript heap out of memory`,
  `Command exited with non-zero status N` albo `Command terminated by signal N`.

**STOP — pamięć.** Wklej linię `exit=…` i wyniki czterech komend wynikowych dla Sharga. Jeśli
szczyt przekracza ok. 2 500 000 kB albo podgląd kończy się komunikatem
`JavaScript heap out of memory` (to limit sterty Node, nie brak RAM-u), nie próbuj dalej i nie
uruchamiaj pozostałych hurtowni — czekasz na opcje. To samo, gdy Sharg odpowie błędem zamiast
feedu (`Feed fetch failed`, `Parsed 0 products`): pobieranie serwer–serwer nie było jeszcze
u Sharga potwierdzone.

Po zgodzie — Kolba i Spechurt, każda osobno (zmień `sharg` w nazwie pliku i w komendzie na `kolba`,
potem `spechurt`).

**STOP — liczby.** Wklej wyniki trzech podglądów. Z nich powstaje propozycja harmonogramu,
a przed importem każdej hurtowni akceptujesz jej liczby i marżę.

Gdy cron już działa, podgląd uruchamiaj pod tą samą blokadą co import, żeby dwa parsowania nie
zderzyły się w pamięci.

`hydra-import`:

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock npx tsx scripts/xml-to-baselinker.ts sharg --dry-run > ~/logs/preview-sharg.log 2>&1; echo "exit=$?"
# exit=1 od razu i pusty plik = trwa import albo sync; spróbuj później
```

## 7. Harmonogram

Decyzja tj 2026-10-13: raz na dobę, dla każdej hurtowni import i zaraz po nim sync; Kolba i Sharg
kończą przed 02:00 UTC. Godziny w UTC, strefy serwera nie zmieniamy. Spechurt przesunięty decyzją
tj 2026-10-19 (HA-2.33) — jego feed o 04:05 UTC był pusty cztery noce z rzędu.

Dlaczego 02:00 UTC: sklep kopiuje BaseLinkera raz na dobę, o tej godzinie (cron Vercela
`/api/shop/sync`). Do sklepu trafia stan katalogu z tej jednej chwili; sync zrobiony w ciągu dnia
niczego w sklepie nie zmienia.

| Start (UTC) | Czas polski latem / zimą | Co | Limit | Najpóźniejszy koniec (UTC) |
|---|---|---|---|---|
| 20:20 | 22:20 / 21:20 | Kolba — import | 140 min | 22:41 |
| 22:55 | 00:55 / 23:55 | Kolba — sync | 10 min | 23:06 |
| 23:15 | 01:15 / 00:15 | Sharg — import | 90 min | 00:46 |
| 00:50 | 02:50 / 01:50 | Sharg — sync | 10 min | 01:01 |
| 01:01–04:35 | | nic nie chodzi: o 02:00 UTC sklep kopiuje BaseLinkera; Spechurt regeneruje feed (okno nieznane, patrz niżej) | | |
| 04:35 | 06:35 / 05:35 | Spechurt — import | 120 min | 06:36 |
| 06:50 | 08:50 / 07:50 | Spechurt — sync | 10 min | 07:01 |

Zasady, z których to wynika:

- **Odstęp między startami jest większy niż limit wcześniejszego uruchomienia plus 60 s** (tyle
  wrapper czeka po sygnale, zanim zabije proces). Dwa uruchomienia nie mogą się więc nałożyć,
  a linia `SKIP` w dzienniku oznacza coś spoza harmonogramu: aktualizację kodu, podgląd, partię
  próbną albo ręczne uruchomienie w tym czasie.
- **Sync zaraz po imporcie tej samej hurtowni.** Import zapisuje tylko produkty, które
  przechodzą filtr, czyli mają stan; produkt wyprzedany u hurtowni zeruje dopiero sync. Produktu,
  który z feedu zniknął, nie zeruje nic (wpis w deferred).
- **Limity z pomiarów** (decyzja tj 2026-10-15). Importy: Kolba 3947 s (1,26 s na produkt),
  Sharg 3050 s (1,34 s), Spechurt 2610 s (1,34 s); synce 61 / 84 / 89 s. Reguła: import ok. 2×
  zmierzony czas, w górę do 10 min — Kolba 140 min (8400 s, 2,13×), Spechurt 90 min (5400 s,
  2,07×); Sharg zostaje przy 90 min (5400 s, 1,77×), bo ta wartość przeszła prawdziwy import;
  sync 10 min (600 s, zapas co najmniej 6,7×). Limit zadziała dopiero przy średnio 2,7 s na
  produkt (Kolba), 2,4 s (Sharg) i 2,8 s (Spechurt). Odstęp między startami jest większy niż
  limit + 60 s; najmniejszy zapas to 240 s. Limity przeliczaj z pola `duration=` w dzienniku,
  gdy feed urośnie.
- **Limit importu Spechurta 7200 s** (HA-2.33, decyzja tj 2026-10-19): 2610 s zmierzonego importu
  plus do 1800 s ponawiania pobrania (3 próby co 600 s, patrz „Pusty feed” niżej), z zapasem.
  Odstęp do synca: 04:35 + 7200 s + 60 s = 06:36 < 06:50. Limity Kolby (8400 s) i Sharga (5400 s)
  mieszczą ich importy także z pełnym ponawianiem (3947 + 1200 = 5147 s; 3050 + 1200 = 4250 s).
  Limit synca 600 s **nie** mieści ponawiania: sync z pustym feedem skończy się limitem
  (`exit=124`) po pierwszej przerwie 600 s, a nie `[fatal] empty feed` — tak czy inaczej na
  czerwono w dzienniku.
- **Pusty feed to błąd, nie import niczego** (HA-2.33, `xml-integration/feed-guard.ts`). Pusta
  odpowiedź albo odpowiedź bez produktów jest pobierana ponownie `FEED_RETRY_ATTEMPTS` razy co
  `FEED_RETRY_DELAY_S` sekund (domyślnie 3 / 600; zmienne opcjonalne, nazwy w
  `.env.local.example`); po ostatniej próbie skrypt kończy się `[fatal] empty feed after N
  attempts`, `exit 1`, a wrapper wpisuje tę linię jako `result=` w `END exit=1` i zgłasza
  uruchomienie na stderr (`cron-stderr.log`). Dotyczy importu, synca i `--dry-run` wszystkich
  trzech hurtowni; `--from-file` nie ponawia (plik się nie zmieni). Przed HA-2.33 pusty feed
  kończył się `Nothing to import.` i `exit 0` — dziennik był zielony, a katalog stał.
- **Co się dzieje przy limicie.** Import zatrzymany limitem zostawia hurtownię odświeżoną
  częściowo, a następnej nocy zaczyna od początku feedu. Za ciasny limit ucinałby więc co noc
  ten sam ogon — w dzienniku widać to jako `stopped-by=limit-…` noc w noc. Bez limitów
  przeciągnięty import zabrałby okno własnemu sync (np. sync Kolby o 22:55 UTC), a zerowanie
  wyprzedanych produktów tej hurtowni czekałoby dobę.
- **Spechurt — okno regeneracji feedu.** Źródła mówiły „stan raz na dobę między 3:00 a 4:00”
  bez strefy, więc HA-2.15 ustawiło import na 04:05 UTC. Obserwacja z czterech nocy
  (15/16–18/19.10.2026, dziennik): o 04:05 UTC (06:05 PL) feed jest pusty (`Received 0.0 MB`,
  `Parsed 0`), o 05:40 UTC (07:40 PL) pełny (16,3 MB, 6183 produkty). Okno regeneracji leży
  więc gdzieś między ~04:00 a 05:40 UTC i jego koniec nie jest znany — jedna próbka, nie
  pomiar. Stąd import 04:35 UTC **z ponawianiem** (do trzech pobrań przez 20 min), a nie
  samo przesunięcie (decyzja tj 2026-10-19, D1 = B). Jeśli dziennik pokaże `[fatal] empty
  feed` noc w noc albo `attempt 2/3` regularnie, przesuń start dalej (06:00 UTC nadal mieści
  sync o 06:50 tylko przy limicie ≤ 2340 s — wtedy przesuń też sync). Dzienny stan Spechurta
  trafia do sklepu dopiero przy następnym 02:00 UTC, czyli dobę później; zmieniłoby to
  przesunięcie crona Vercela (wpis w deferred, poza tym zadaniem) — po HA-2.33 sync
  Spechurta kończy się ok. 06:52 UTC, więc kopia „po wszystkich hurtowniach” to ≥ 07:00 UTC.
- **Produkt wspólny dla dwóch hurtowni** (ten sam EAN) to w BaseLinkerze jeden produkt. Nazwę,
  opis, kategorię i cenę sprzedaży wyznacza hurtownia, która zapisała go ostatnia przed 02:00 UTC:
  Sharg, jeśli go ma; w parze Kolba–Spechurt Kolba; Spechurt nigdy. Reguły „wygrywa najtańsza
  hurtownia” nie ma (O-32).
- **Ruch.** Import nie przekracza 86 zapytań do BaseLinkera na minutę przy limicie ok. 100; sync
  to kilkanaście zapytań. Sharg dostaje dwa pobrania pełnego feedu na dobę (przy każdym także
  manifest i parametry). Sync zamówień sklepu (co 4 h UTC) nachodzi na import Sharga na wspólnym
  limicie zapytań; dziś robi kilka zapytań.
- **Strefa.** Cron na Ubuntu 26.04 nie ma stref per użytkownik, więc crontab jest w UTC jak zegar
  serwera i nie ma zmiany czasu do obsłużenia. Dziennik i nazwy logów są w czasie polskim: wpis
  z 20:20 UTC ma w dzienniku 22:20+0200 latem i 21:20+0100 zimą, a import Sharga z 23:15 UTC nosi
  datę następnego dnia.

Dzienne synchronizacje (np. Kolba co 3 h) dokładamy przy starcie sprzedaży (HA-2.09), razem
z decyzją, jak często sklep kopiuje BaseLinkera.

## 8. Pierwszy import na żywo

Kolejność hurtowni: z decyzji o harmonogramie. Ma znaczenie, bo produkt o tym samym EAN u dwóch
hurtowni to w BaseLinkerze jeden produkt, a jego nazwę, opis i cenę nadpisuje ta hurtownia, która
importuje później.

Warunki wstępne — wszystkie naraz:

1. sklep nie sprzedaje (notatka tj z 2026-10-06: import z marżą wstępną tylko wtedy);
2. **STOP — O-33.** Klient nie odpowiedział, czym są integracje „hydra-arms.co…” i HYDRA-ARMS
   (Allegro) na koncie BaseLinkera ani czy Sharg ma iść naszym importem, czy przez Base Connect
   „SHARG (Hurtownia)”. Decyzja tj, czy importujemy mimo to;
3. podgląd danej hurtowni z kroku 6 i jej marża z kroku 4 zaakceptowane przez tj;
4. crontab **nie jest** jeszcze zainstalowany (krok 10) — inaczej pierwszy import zrobiłby się sam
   w nocy, bez akceptacji;
5. diagnostyka feedów (niżej) nie pokazuje produktów dwóch hurtowni dopasowanych po samym SKU —
   decyzja tj 2026-10-13: przy wyniku zerowym import idzie, przy niezerowym wracamy z liczbami.

**STOP — przed każdą hurtownią.** Import danej hurtowni uruchamiasz dopiero po zgodzie. Zgoda
obejmuje liczby z podglądu i marżę tej hurtowni.

### Diagnostyka feedów — przed pierwszym importem

Import szuka produktu w BaseLinkerze po EAN między hurtowniami, a gdy EAN nie trafi — po SKU
z przedrostkiem hurtowni (`KOLBA-…`, `SHARG-…`, `SPECHURT-…`), czyli tylko wśród produktów tej
samej hurtowni (HA-2.28). Przed tą zmianą SKU było gołe i wspólne dla całego katalogu: SKU Sharga
to liczby, SKU Spechurtu też bywa liczbą, więc dwa niezwiązane produkty zlewały się w jeden rekord
(pomiar z 2026-10-14 na prawdziwych feedach dał liczby niezerowe). Narzędzie pobiera feedy tak jak
import, symuluje trzy importy i sync tym samym kluczem co import, i wypisuje same liczby
z przykładami nazw. Nie woła BaseLinkera i niczego nie zapisuje. Uruchamiasz je na kodzie
po merge HA-2.28 (sekcja „Aktualizacja kodu”, bez `git switch main` przed merge PR-a).

`hydra-import`:

```bash
cd /home/hydra-import/hydra && git pull --ff-only
D=~/logs/diag-feedy.log
npx tsx scripts/xml-feed-diagnostics.ts > "$D" 2>&1; echo "exit=$?"
grep -cE 'key=|token=' "$D"                # musi być 0, zanim cokolwiek wkleisz
cat "$D"
```

Co odczytać:

- `admitted by the assortment filter` — te same liczby co w podglądzie z kroku 6;
- `same SKU only … earlier supplier` przy imporcie i `found through the SKU alone` przy sync —
  **mają być 0** dla każdej z trzech hurtowni. Każda inna liczba to produkty, które by się zlały;
  pod spodem są przykłady par;
- `same EAN as a product of an earlier supplier` — produkty, które naprawdę mają dwie hurtownie;
  tu obowiązuje zasada z kroku 7 (wygrywa hurtownia importowana później). Liczby z pomiaru
  z 2026-10-14 (stary klucz): Sharg 5, Spechurt 122 — zmiana klucza nie powinna ich ruszyć;
- `repeats inside own feed` — ten sam produkt dwa razy w jednym feedzie; drugi wpis nadpisuje
  pierwszy (tak jak w imporcie);
- `EAN shapes` — długości inne niż 8, 12, 13 i 14 cyfr to EAN-y, które po drodze straciły zera
  wiodące (znany błąd konektora Sharga, wpis w deferred);
- `SHARG STOCK` — czy stan w pełnym feedzie, z którego korzystają import i sync, zgadza się
  z feedem lekkim;
- `feed generated` — kiedy hurtownia wygenerowała plik.

**STOP — diagnostyka.** Wklej wynik (po sprawdzeniu `grep -c`).

### Uzbrojenie serwera — raz, po pierwszej zgodzie

Znacznik podaje katalog, do którego ten serwer ma prawo pisać. Odróżnia serwer od komputera, na
którym wrapper uruchomiony przez pomyłkę zapisałby do produkcyjnego BaseLinkera — nie zakładamy
go na żadnej innej maszynie. I przypina katalog: jeśli `BASELINKER_INVENTORY_ID` w `.env.local`
kiedykolwiek będzie inne niż `119068` (literówka, stara linia, podwójny wpis), wrapper odmówi
z komunikatem `catalogue mismatch`.

`hydra-import`:

```bash
cd /home/hydra-import/hydra
printf 'inventory=119068\n' > ~/.hydra-import-server
scripts/server/run-bl.sh --check sharg import; echo "exit=$?"
env -i HOME="$HOME" PATH=/usr/local/bin:/usr/bin:/bin HYDRA_MAX_SECONDS=5400 scripts/server/run-bl.sh --check sharg import; echo "exit=$?"
#   druga komenda sprawdza to samo w otoczeniu takim, jakie daje cron; w jej wyniku jest „limit 5400s”
#   … CHECK ok — nothing was run. A real run would start in /home/hydra-import/hydra:
#     /home/hydra-import/hydra/node_modules/.bin/tsx scripts/xml-to-baselinker.ts sharg import
#     (catalogue 119068, limit none, lock /home/hydra-import/.hydra-run-bl.lock) ; exit=0
```

Wklej oba wyniki. Od tej chwili `run-bl.sh <hurtownia> import` albo `sync` bez `--check` zapisuje
do BaseLinkera.

### Partia próbna — opcjonalnie

Żeby obejrzeć kilka produktów w panelu BaseLinkera przed pełnym importem. To jedyny zapis poza
wrapperem, więc ta jedna linia robi sama to, co wrapper: najpierw `--check` (katalog w `.env.local`
musi zgadzać się ze znacznikiem), potem ta sama blokada, a odblokowanie dostaje wyłącznie proces
importu.

`hydra-import`:

```bash
H=sharg                                    # hurtownia, na którą masz zgodę
cd /home/hydra-import/hydra && scripts/server/run-bl.sh --check "$H" import && flock -n /home/hydra-import/.hydra-run-bl.lock env TZ=Europe/Warsaw HA_ALLOW_PROD=1 npx tsx scripts/xml-to-baselinker.ts "$H" import --limit=500 > ~/logs/proba-$H-import.log 2>&1; echo "exit=$?"
# exit=78 i linia ERROR na ekranie = --check odmówił; import nie wystartował
# exit=1 od razu i pusty plik = blokada zajęta (trwa inne uruchomienie)
grep -cE 'key=|token=' ~/logs/proba-$H-import.log     # musi być 0, zanim cokolwiek wkleisz
head -n 12 ~/logs/proba-$H-import.log                 # inventory : 119068 oraz markup : +N% (zaakceptowana stawka)
grep -E 'Filtered|Assortment filter|Import done' ~/logs/proba-$H-import.log
```

`--limit=N` bierze pierwsze N produktów ze stanem z początku feedu, a dopiero potem filtr
asortymentu, więc zapisanych jest mniej niż N: przy Kolbie `--limit=20` dało 0 zapisów,
a `--limit=500` 185 (2026-10-14). Podgląd z `--dry-run --limit=N` liczy N od początku feedu
bez warunku stanu, więc jego liczby nie zgadzają się z partią próbną (500 → 104 przyjętych;
wpis w deferred); pełnych uruchomień bez `--limit` to nie dotyczy.

### Pełny import

W tle, żeby zerwane połączenie SSH go nie przerwało.

`hydra-import`:

```bash
H=sharg                                    # hurtownia, na którą masz zgodę
L=5400                                     # limit czasu w sekundach: Kolba 7200, Sharg i Spechurt 5400
cd /home/hydra-import/hydra
HYDRA_MAX_SECONDS="$L" scripts/server/run-bl.sh --check "$H" import; echo "exit=$?"     # CHECK ok … catalogue 119068, limit ${L}s
HYDRA_MAX_SECONDS="$L" nohup scripts/server/run-bl.sh "$H" import > /dev/null 2>&1 &
sleep 5
J="$(ls -t ~/logs/run-bl-*.log | head -n 1)"; tail -n 2 "$J"     # linia START: catalogue=119068, nazwa logu
LOG="$(grep ' START ' "$J" | tail -n 1 | sed -n 's/.* log=\([^ ]*\).*/\1/p')"; echo "$LOG"
head -n 12 "$LOG"                          # inventory : 119068 oraz markup : +N% (zaakceptowana stawka)
tail -f "$LOG"                             # „+” nowy produkt, „.” aktualizacja; Ctrl-C kończy tylko podgląd
```

Podgląd na żywo (`tail` z opcją follow) nie kończy się sam po zakończeniu importu i przestaje się
odświeżać — koniec importu widać w dzienniku (linia `END`), nie na ekranie. Ctrl-C kończy tylko
podgląd.

Pierwszy import idzie z limitem czasu (zdrowy przebieg go nie dotyka, zawieszony oddaje
blokadę): Kolba `HYDRA_MAX_SECONDS=7200` (decyzja tj 2026-10-14: 3× szacunek 37 min; wyszło
66 min), Sharg i Spechurt `5400` — to wartość z tabeli sekcji 7, więc pierwszy import sprawdza
też limit, który pójdzie do crontaba. Limit zatrzymuje cały import — w dzienniku
`stopped-by=limit-…`, a hurtownia zostaje odświeżona częściowo.

Wrapper nie wystartuje z innym katalogiem niż `119068` (pilnuje tego znacznik). Gdyby mimo to log
pokazał inny katalog albo inną marżę, albo import trzeba było przerwać: zatrzymanie opisuje
sekcja „Obsługa”. Między startem a pierwszym zapisem jest pobranie i parsowanie feedu, więc jest
na to czas.

### Red proof blokady na serwerze

Teraz, dopóki import trwa (`tail -f` w pierwszej sesji nadal dopisuje znaki), z drugiej sesji.
Drugi start idzie komendą zastępczą: bierze tę samą blokadę, a gdyby blokada była wolna, wykona
tylko `true` — nie sync i bez odblokowania prod.

`hydra-import`:

```bash
/home/hydra-import/hydra/scripts/server/run-bl.sh --cmd true sharg sync; echo "exit=$?"     # exit=0 od razu
tail -n 3 "$(ls -t ~/logs/run-bl-*.log | head -n 1)"
```

Oczekiwane: linia `START` trwającego importu, potem `SKIP lock held by another run — skipping
(holder: … import pid=…)` z tym samym `pid` co w linii `START`. Wklej je razem z późniejszą linią
`END` importu.

Jeśli zamiast `SKIP` pojawiają się `START … what=stand-in` i `END … what=stand-in`, blokada była
wolna: import już się skończył albo nie wystartował. Nic nie zostało zapisane; powtórz dowód przy
imporcie następnej hurtowni. Prawdziwego `run-bl.sh <hurtownia> sync` do tego dowodu nie używaj —
przy wolnej blokadzie zacząłby zapis.

### Po zakończeniu importu

Blok ustawia `LOG` od nowa, więc działa też w nowej sesji i dla każdej hurtowni.

`hydra-import`:

```bash
J="$(ls -t ~/logs/run-bl-*.log | head -n 1)"; tail -n 3 "$J"     # END exit=0 … url-credentials=0 result="Import done: …"
LOG="$(grep ' END ' "$J" | grep -v 'what=stand-in' | tail -n 1 | sed -n 's/.* log=\([^ ]*\).*/\1/p')"; echo "$LOG"
grep -cE 'key=|token=' "$LOG"              # 0
grep -E '^(Received|Parsed)|prod-guard|Assortment filter|no_stock|not_p1|Category resolution|Import done|skipped:|tags:|^ *⚠|\[warn\]' "$LOG"
grep -c '^  ⚠' "$LOG"                      # liczba produktów, których zapis się nie udał (w tym pominiętych)
grep -m 5 '^  ⚠' "$LOG"                    # pierwsze pięć takich linii
grep -c 'not returned by getInventoryProductsData' "$LOG"   # z tego: pominięte, bo BL nie oddał danych
```

Do odczytania: `✓ Import done: N created, M updated, K errors`, pod spodem `skipped: S (no BL
data — counted in errors, nothing overwritten)` — produkty dopasowane do katalogu, dla których
BaseLinker nie oddał tagów, SKU i parametrów; import ich nie ruszył (każdy ma linię
`⚠ <sku> (<nazwa>): BL product <id> not returned by getInventoryProductsData — skipped, nothing
overwritten` i jest wliczony w `K errors`). Dalej liczby tagów i ostrzeżenia o cenach (`no purchase
price` — cena z feedu zamiast marży; `price 0` — produkt bez ceny). Linia z `prod-guard`
potwierdza, że odblokowanie dostał proces importu.

Zakres liczników: w podsumowaniu importu `tags: auto / review / flag` liczy cały feed przed filtrem
asortymentu (suma = liczba produktów feedu), a `permit tags:` tylko produkty zapisane. W podglądzie
(krok 6) oba liczą cały feed — dlatego liczby tagów pozwoleń z podglądu są górną granicą tego, co
trafi do BaseLinkera (Kolba: podgląd `14 / 2 784 / 14`, import `13 / 500 / 13`).

Nic nie publikuje się samo: sklep pokazuje tylko produkty z tagiem `approved`.

## 9. Pierwszy sync

Po imporcie wszystkich trzech hurtowni. `sync` odświeża stan w magazynie hurtowni i cenę
sprzedaży produktów, które już są w katalogu; niczego nie tworzy.

Każdy sync i każdy import **nadpisuje cenę sprzedaży** wyliczoną z ceny zakupu i marży z pliku
env. Cena poprawiona ręcznie w BaseLinkerze nie przetrwa najbliższego uruchomienia (pytanie O-32
jest otwarte).

Co dokładnie robi sync (odczyt kodu, `runSync`):

- iteruje po **całym feedzie** hurtowni (bez filtra stanu i asortymentu) i dopasowuje kluczem
  importu: EAN między hurtowniami, inaczej prefiksowane SKU tej hurtowni;
- dla każdego dopasowania zapisuje stan do magazynu tej hurtowni i cenę sprzedaży do grupy z env —
  **także 0 i cenę brutto z feedu (fallback)**; cenę zakupu tylko wtedy, gdy jest > 0;
- dotyczy to też rekordów utworzonych przez inną hurtownię (wspólny EAN): ich cenę sprzedaży
  ustawia ta hurtownia, która robiła sync ostatnia, także gdy ma stan 0 albo cenę 0;
- niczego nie tworzy: produkty feedu spoza BL są liczone jako „not in BL yet”.

Zmierzone `Matched` (pierwszy sync, 2026-10-15): Kolba 3469 (10 384 poza BL, razem 13 853),
Sharg 2318 (6703, razem 9021), Spechurt 2130 (4030, razem 6160); sync trwał 61 / 84 / 89 s.
`⚠ N products synced with price 0` obejmuje też własne zera (Kolba: 103 z importu), więc
nagłówkiem jest przyrost ponad nie; przy pierwszym sync nie było żadnego przyrostu.

**STOP — przed pierwszym sync.** Sync zapisuje ceny. Uruchamiasz go po zgodzie, gdy wyniki importu
trzech hurtowni są wklejone.

`hydra-import`, dla każdej hurtowni:

```bash
H=sharg
cd /home/hydra-import/hydra
scripts/server/run-bl.sh "$H" sync; echo "exit=$?"
J="$(ls -t ~/logs/run-bl-*.log | head -n 1)"; tail -n 2 "$J"     # END exit=0 … result="Sync done: N products refreshed"
LOG="$(grep ' END ' "$J" | grep -v 'what=stand-in' | tail -n 1 | sed -n 's/.* log=\([^ ]*\).*/\1/p')"; echo "$LOG"
grep -cE 'key=|token=' "$LOG"              # 0
grep -E 'prod-guard|Matched|stock |prices |Sync done|^⚠' "$LOG"
```

Do odczytania: `Matched N products`, linie `stock …: X updated` i `prices …: X updated`,
`✓ Sync done: N products refreshed`.

## 10. Crontab

Kształt zaakceptowany przez tj 2026-10-13, treść ostateczna — 2026-10-15 (limity z pomiarów,
sekcja 7). Zainstalowany na koncie `hydra-import` z pliku (`crontab <plik>`); pierwszy
bezobsługowy przebieg: 2026-10-15 20:20 UTC. Spechurt przesunięty na 04:35 / 06:50 UTC
z limitem importu 7200 s — treść zaakceptowana przez tj 2026-10-20 (HA-2.33, sekcja 7);
pozostałe cztery linie bez zmian.

```
# Hydra Arms — import hurtowni do BaseLinkera (HA-2.15, HA-2.33). Konto hydra-import. GODZINY W UTC.
# Liczba przed komendą to limit czasu w sekundach; odstęp do następnego startu jest większy niż limit + 60 s.
# Limity z pomiarów 2026-10-14/15: import ok. 2x zmierzony czas, sync 600 s.
# Spechurt import 7200 s (HA-2.33): 2610 s importu + do 1800 s ponawiania pobrania (3 próby co 600 s) + zapas.
# Instrukcja: docs/ops/serwer-importu.md
SHELL=/bin/sh
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=""

# Kolba: import (22:20 czasu polskiego latem / 21:20 zimą), potem sync
20 20 * * * HYDRA_MAX_SECONDS=8400 /home/hydra-import/hydra/scripts/server/run-bl.sh kolba import 2>>/home/hydra-import/cron-stderr.log
55 22 * * * HYDRA_MAX_SECONDS=600 /home/hydra-import/hydra/scripts/server/run-bl.sh kolba sync 2>>/home/hydra-import/cron-stderr.log
# Sharg: import (01:15 latem / 00:15 zimą), potem sync
15 23 * * * HYDRA_MAX_SECONDS=5400 /home/hydra-import/hydra/scripts/server/run-bl.sh sharg import 2>>/home/hydra-import/cron-stderr.log
50 0 * * * HYDRA_MAX_SECONDS=600 /home/hydra-import/hydra/scripts/server/run-bl.sh sharg sync 2>>/home/hydra-import/cron-stderr.log
# 01:01-04:35 UTC nic nie chodzi: o 02:00 UTC sklep kopiuje BaseLinkera
# Spechurt: feed pusty o 04:05 UTC cztery noce z rzędu (15-19.10.2026), pełny o 05:40 UTC; koniec okna regeneracji nieznany
# Spechurt: import (06:35 latem / 05:35 zimą) z ponawianiem pustego feedu, potem sync (08:50 / 07:50)
35 4 * * * HYDRA_MAX_SECONDS=7200 /home/hydra-import/hydra/scripts/server/run-bl.sh spechurt import 2>>/home/hydra-import/cron-stderr.log
50 6 * * * HYDRA_MAX_SECONDS=600 /home/hydra-import/hydra/scripts/server/run-bl.sh spechurt sync 2>>/home/hydra-import/cron-stderr.log
```

Co jest w tych liniach:

- crontab należy do konta `hydra-import` (`crontab <plik>` po `sudo -iu hydra-import`;
  `crontab -l` na koncie `ubuntu` zostaje pusty);
- każda linia woła wrapper, który sam załatwia blokadę, logi i odblokowanie prod; linie nie
  zawierają `HA_ALLOW_PROD`;
- `HYDRA_MAX_SECONDS=…` przed komendą to limit czasu tego uruchomienia w sekundach — sama liczba.
  Wartość, której wrapper nie rozumie (np. `90m`), kończy się odmową, a nie brakiem limitu;
- `2>>…/cron-stderr.log`: pod cronem wrapper milczy przy powodzeniu i przy pominięciu, a odmowy
  i nieudane uruchomienia wypisuje na stderr. Trafiają do tego pliku razem z błędami, które
  zdarzą się, zanim wrapper cokolwiek zapisze (np. literówka w ścieżce). Niepusty plik znaczy, że
  coś się nie udało. `MAILTO=""` wyłącza pocztę, której na serwerze nie ma;
- komentarze stoją w osobnych liniach, a plik kończy się znakiem nowej linii — inaczej cron uzna
  go za uszkodzony;
- instalujesz go **po** kroku 9, nie wcześniej.

Instalacja, po akceptacji treści — `hydra-import`:

```bash
crontab /sciezka/do/crontab-hydra-import.txt   # plik z zaakceptowaną treścią (nie crontab -e)
crontab -l                                      # wklej wynik
```

Sprawdzenie następnego dnia — `hydra-import`:

```bash
grep -E ' (START|END|SKIP|STOP|ERROR|WARN) ' "$(ls -t ~/logs/run-bl-*.log | head -n 1)" | tail -n 14
test -s ~/cron-stderr.log && cat ~/cron-stderr.log || echo "cron-stderr.log pusty"
```

Oczekiwane: sześć par `START` / `END exit=0` w kolejności z kroku 7, żadnego `SKIP`, pusty
`cron-stderr.log`.

## Odblokowanie prod

Skrypt importu odmawia zapisu do BaseLinkera, dopóki w otoczeniu **tego jednego procesu** nie ma
`HA_ALLOW_PROD=1`.

- **Przez wrapper** (cron i zwykłe uruchomienia ręczne) niczego nie dopisujesz: wrapper ustawia
  zmienną wyłącznie dla procesu importu, a odziedziczoną z otoczenia usuwa.
- **Bez wrappera** — tylko partia próbna z kroku 8 — zmienna stoi w tej jednej linii tuż przed
  komendą importu (`env … HA_ALLOW_PROD=1 npx tsx …`), po `--check` i po `flock`.
- Nigdy w `.env.local`, w `~/.profile`, `~/.bashrc` ani w nagłówku crontaba.

## 11. Porządki — decyzje tj 2026-10-15

Wszystko poniżej leży na koncie `ubuntu` i po wdrożeniu nie jest potrzebne importowi. Odczyt
z 2026-10-15: `.env.local` 644 (3431 B), stary klon 2,0 GB, `~/.bash_history` z 4 liniami `key=` /
`token=`, w `~/.ssh` klucz `github_deploy` i `config`; `count-adhoc.ts` bez danych dostępowych.

| Co | Decyzja |
|---|---|
| `/home/ubuntu/hydra/.env.local` | usunąć (trzyma stare klucze Supabase service role, Sanity, Resend) |
| `scripts/count-adhoc.ts`, `hydra-categories.json` (nieśledzone) | idą z klonem |
| cały `/home/ubuntu/hydra` | usunąć |
| `~/spechurt-import.log`, `~/spechurt.xml`, `~/spechurt-2026-09-26.xml` | usunąć |
| `~/.bash_history` | wyczyścić (4 trafienia) |
| `~/hydra-import.env` (serwer i Mac) | brak — potwierdzone |
| `~/.ssh/github_deploy`, `.pub`, wpis w `~/.ssh/config` | usunąć z serwera; klucz deploy w ustawieniach repo na GitHubie usuwa tj |

**Wykonane 2026-10-15** (tryb próbny, potem `GO=1`; wynik i weryfikacja w notatkach zadania):
usunięto wszystkie pozycje z tabeli, `~/.ssh/config` miał jeden blok `Host`, `authorized_keys`
nietknięte. Klucz deploy w ustawieniach repo na GitHubie — po stronie tj, niepotwierdzony.

Jeden blok, `ubuntu`, z Maca. Najpierw z `GO=0` (odczyt i straże, niczego nie usuwa), po sprawdzeniu
wyniku ten sam blok z `GO=1` w pierwszej linii (usuwa i drukuje weryfikację). Straże zatrzymują
blok, gdy trwa import, klon jest dowiązaniem, nowy klon nie ma wrappera albo coś w cronie
wskazuje na stary klon. `authorized_keys` i `known_hosts` nie są ruszane; `~/.ssh/config` znika
tylko wtedy, gdy ma jeden blok `Host` i ten odwołuje się do `github_deploy`.

```bash
ssh hydra-srv 'GO=0 bash -s' <<'EOF'
set -u
fail() { echo "STOP: $*"; exit 1; }

# ---- 0. gdzie jestem
[ "$(id -un)" = ubuntu ] || fail "to nie jest konto ubuntu"
cd /home/ubuntu || fail "brak katalogu domowego"
OLD=/home/ubuntu/hydra
NEW=/home/hydra-import/hydra

# ---- 1. tylko odczyt
echo "=== 1. odczyt"
ls -la "$OLD/.env.local" "$OLD/scripts/count-adhoc.ts" ~/spechurt-import.log ~/spechurt.xml ~/spechurt-2026-09-26.xml ~/hydra-import.env 2>&1
du -sh "$OLD"
n=$(grep -c -e 'key=' -e 'token=' ~/.bash_history 2>/dev/null); echo "ubuntu: .bash_history, linii z key=/token=: ${n:-brak pliku}"
n=$(sudo grep -c -e 'key=' -e 'token=' /home/hydra-import/.bash_history 2>/dev/null); echo "hydra-import: .bash_history, linii z key=/token=: ${n:-brak pliku}"
echo "--- ~/.ssh/config:"; cat ~/.ssh/config 2>&1
ls -la ~/.ssh
pgrep -af run-bl || echo "brak procesów importu"
echo "wpisy run-bl.sh w crontabie hydra-import (oczekiwane 6): $(sudo -u hydra-import crontab -l 2>/dev/null | grep -c 'run-bl.sh')"

# ---- straże: jeśli któraś nie przejdzie, nic nie zostanie usunięte
[ -d "$OLD/.git" ] || fail "$OLD nie jest klonem git"
[ "$(readlink -f "$OLD")" = "$OLD" ] || fail "$OLD jest dowiązaniem symbolicznym"
sudo test -x "$NEW/scripts/server/run-bl.sh" || fail "nowy klon $NEW nie ma wrappera"
if pgrep -f run-bl >/dev/null; then fail "trwa uruchomienie importu"; fi
if sudo grep -rsl -e "$OLD" /etc/crontab /etc/cron.d /var/spool/cron >/dev/null 2>&1; then fail "coś w cronie wskazuje na stary klon"; fi
echo "straże: OK"

if [ "${GO:-0}" != 1 ]; then
  echo "=== TRYB PRÓBNY (GO=0): niczego nie usunięto. Powtórz z GO=1 w pierwszej linii."
  exit 0
fi

# ---- 2. usuwanie
echo "=== 2. usuwanie"
rm -v -- "$OLD/.env.local"
rm -rf -- "$OLD"
rm -v -- ~/spechurt-import.log ~/spechurt.xml ~/spechurt-2026-09-26.xml
: > ~/.bash_history
rm -v -- ~/.ssh/github_deploy ~/.ssh/github_deploy.pub
CFG=~/.ssh/config
if [ -f "$CFG" ]; then
  if grep -q github_deploy "$CFG"; then
    hosts=$(grep -c -i -e '^[[:space:]]*Host[[:space:]]' "$CFG")
    if [ "$hosts" = 1 ]; then rm -v -- "$CFG"
    else echo "RĘCZNIE: $CFG ma inne bloki Host — usuń tylko blok z github_deploy"; fi
  else echo "$CFG nie wspomina github_deploy — bez zmian"; fi
fi

# ---- 3. weryfikacja
echo "=== 3. weryfikacja"
for f in "$OLD" ~/spechurt-import.log ~/spechurt.xml ~/spechurt-2026-09-26.xml ~/hydra-import.env ~/.ssh/github_deploy ~/.ssh/github_deploy.pub; do
  if [ -e "$f" ]; then echo "JEST:  $f"; else echo "brak:  $f"; fi
done
echo ".bash_history: $(wc -c < ~/.bash_history) B, linii z key=/token=: $(grep -c -e 'key=' -e 'token=' ~/.bash_history)"
ls -la ~/.ssh
if [ -s ~/.ssh/authorized_keys ]; then echo "authorized_keys: $(wc -l < ~/.ssh/authorized_keys) linii (nietknięte)"; else echo "UWAGA: authorized_keys puste lub brak"; fi
ls -la ~
du -sh ~
echo "crontab hydra-import, wpisy run-bl.sh (6): $(sudo -u hydra-import crontab -l | grep -c 'run-bl.sh')"
sudo test -x "$NEW/scripts/server/run-bl.sh" && echo "nowy klon: wrapper jest"
EOF
```

W otwartej, interaktywnej sesji `ubuntu` wykonaj dodatkowo `history -c` i `unset HISTFILE` przed
wyjściem — inaczej powłoka dopisze swoją historię z powrotem przy zamknięciu.

Tokeny Sharga i klucz Spechurtu są też w publicznym repo, więc usunięcie plików z serwera ich nie
chroni; chroni dopiero rotacja u hurtowni. Ryzyko zaakceptowane w HA-1.02 dotyczy migracji 004;
próbka manifestu Sharga z tokenami pozostałych feedów jest osobnym wpisem w
`docs/deferred-tasks.md`, do decyzji tj.

Pliki podglądów, partii próbnej i diagnostyki na koncie `hydra-import` (`~/logs/preview-*.log`,
`proba-*.log`, `diag-feedy.log`) nie są objęte retencją wrappera; `grep` = 0 był wklejony. Zostają
do zamknięcia zadania.

## Audyt importu (HA-2.37) — tylko odczyt

`scripts/audit-import.ts` porównuje dzisiejsze feedy z katalogiem BaseLinkera i z dziennikiem
importu, a wynik zapisuje do katalogu: `raport.md` + pliki CSV z przykładami (do 50 wierszy na
problem). BaseLinkera czyta wyłącznie przez `src/lib/baselinker/readonly.ts`, niczego nie zapisuje,
nie potrzebuje odblokowania prod i nie idzie przez wrapper. Pobiera te same feedy co import (Sharg
~250 MB), więc startuje pod tą samą blokadą `flock`, w dzień: między 07:01 a ok. 19:30 UTC — trwa
kilkanaście minut, a blokada trzymana o 20:20 UTC kazałaby nocnemu importowi Kolby wypisać `SKIP`.

Każda komenda niżej to jedna linia. Na serwer: `ssh hydra-srv` (konto `ubuntu`), na konto importu:
`sudo -iu hydra-import`, z powrotem: `exit`.

1. `hydra-import` — aktualizacja klonu (po merge PR-a HA-2.37; jak „Aktualizacja kodu” w kroku 2):

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock bash -c 'git fetch origin && git switch main && git pull --ff-only && npm ci'; echo "exit=$?"; git log -1 --format='%h %ci %s'; test -f scripts/audit-import.ts && echo "audyt: jest"; scripts/server/run-bl.sh --check sharg sync; echo "check=$?"
```

Oczekiwane: `exit=0`, commit z merge'em HA-2.37, `audyt: jest`, `CHECK ok …`, `check=0`. `exit=1` od
razu, bez wypisu = trwa import albo sync; spróbuj później.

2. `hydra-import` — audyt do `/home/hydra-import/audit-2026-10-26`:

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock npx tsx scripts/audit-import.ts --out /home/hydra-import/audit-2026-10-26 > /home/hydra-import/logs/audit-2026-10-26.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=|client=' /home/hydra-import/logs/audit-2026-10-26.log; tail -n 3 /home/hydra-import/logs/audit-2026-10-26.log; ls /home/hydra-import/audit-2026-10-26
```

Oczekiwane: `exit=0`, `0` (żadnej linii z danymi dostępowymi w logu), trzy ostatnie linie:
`Written N files …`, `BL methods called: getInventories ×1, …` (same metody odczytu),
`credential/URL patterns in output: 0`, a w katalogu `raport.md` i pliki `*.csv`. `exit=1` od razu
i pusty log = blokada zajęta. Inny `exit` — ostatnie linie logu zaczynają się od `[error]` albo
`[fatal]`. Przy `JavaScript heap out of memory` uruchom dwa razy z `--suppliers=kolba,spechurt` i
`--suppliers=sharg`, każdy do osobnego `--out`.

3. Skopiowanie wyniku na Maca — konto `ubuntu` nie widzi `/home/hydra-import`, więc najpierw
`ubuntu` pakuje katalog przez `sudo`:

`ubuntu`:

```bash
sudo tar -C /home/hydra-import -czf /home/ubuntu/audit-2026-10-26.tgz audit-2026-10-26 && sudo chown ubuntu:ubuntu /home/ubuntu/audit-2026-10-26.tgz && ls -l /home/ubuntu/audit-2026-10-26.tgz
```

`Mac`:

```bash
mkdir -p ~/Desktop/hydra_arms && scp hydra-srv:audit-2026-10-26.tgz ~/Desktop/hydra_arms/ && tar -xzf ~/Desktop/hydra_arms/audit-2026-10-26.tgz -C ~/Desktop/hydra_arms && rm ~/Desktop/hydra_arms/audit-2026-10-26.tgz && ls ~/Desktop/hydra_arms/audit-2026-10-26
```

`ubuntu` — po udanym kopiowaniu:

```bash
rm /home/ubuntu/audit-2026-10-26.tgz
```

Raport otwierasz na Macu: `~/Desktop/hydra_arms/audit-2026-10-26/raport.md`. Katalog na serwerze
(`/home/hydra-import/audit-2026-10-26`) i log audytu w `~/logs` nie podlegają retencji wrappera —
usuń je, gdy raport nie będzie już potrzebny.

## Marża ręczna (HA-2.22)

Produkt w katalogu 119068 może mieć w polu dodatkowym „Marża %” własną marżę. Import i sync
liczą wtedy cenę = zakup × (1 + marża z pola), a pole puste = marża hurtowni z env. Import i sync
tylko czytają to pole (`getInventoryProductsData`) — nie zapisują go. Instrukcja dla klienta:
`docs/ops/marza-reczna-klient.md`.

Bez `BASELINKER_EXTRA_FIELD_MARGIN` nowy kod liczy ceny tak jak dotąd (marża z env), więc samo
wgranie kodu niczego nie zmienia. Zmienną podajesz w komendach testowych niżej jako
`env BASELINKER_EXTRA_FIELD_MARGIN=…`. Do `.env.local` trafia dopiero po ostatniej bramce:
skrypt czyta `.env.local` z `override: true`, ale zmiennej, której w pliku nie ma, nie zeruje.

**Dlaczego test na jednym produkcie przed pełnym importem.** Dokumentacja `addInventoryProduct`
nie mówi, czy aktualizacja produktu zostawia klucze `text_fields`, których nie wysłano. Import
wysyła tylko `name`, `description` i `features`. Gdyby BL czyścił pozostałe, każdy import
(także dzisiejszy, bez HA-2.22) skasowałby pola dodatkowe produktów, które aktualizuje.

Kolejność: bramki STOP z HA-2.22. Kroki 1–4 robisz w dzień, między 07:01 a ok. 19:30 UTC, tak
jak audyt. Kroki 1–4 biegną z osobnej kopii (`/home/hydra-import/hydra-ha222`, worktree gałęzi
zadania), więc nocny cron do merge'a dalej chodzi na `main`. `exit=1` od razu, bez wypisu = trwa
import albo sync; spróbuj później. W komendach podmień `<hurtownia>` (`kolba` / `sharg` /
`spechurt` — ta, z której pochodzi produkt testowy), `<ID_PRODUKTU>` (ID produktu w BL)
i `<ID_POLA>` (liczba z kroku 2).

0. **Panel BL (tj) — STOP.** W katalogu 119068 załóż pole dodatkowe „Marża %” (pole tekstowe).
   Na jednym produkcie testowym wpisz `45` i zapisz. Produkt testowy: na stanie u hurtowni (inaczej
   filtr asortymentu go odrzuci i import nic nie zapisze), z ceną zakupu, najlepiej tylko jednej
   hurtowni. Zapisz jego ID i cenę sprzedaży z panelu.

1. `hydra-import` — kopia testowa gałęzi zadania:

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock bash -c 'git fetch origin && git worktree add --detach /home/hydra-import/hydra-ha222 origin/feat/ha-2.22-marza-reczna && cd /home/hydra-import/hydra-ha222 && npm ci && install -m 600 /home/hydra-import/hydra/.env.local .env.local'; echo "exit=$?"; git -C /home/hydra-import/hydra-ha222 log -1 --format='%h %ci %s'; git -C /home/hydra-import/hydra status -sb | head -n 1
```

Oczekiwane: `exit=0`, ostatni commit gałęzi `feat/ha-2.22-marza-reczna`, a główny klon dalej
`## main...origin/main`.

2. `hydra-import` — ID pola z produktu testowego (tylko odczyt):

```bash
cd /home/hydra-import/hydra-ha222 && flock -n /home/hydra-import/.hydra-run-bl.lock npx tsx scripts/xml-to-baselinker.ts <hurtownia> --dry-run --only-bl-id=<ID_PRODUKTU> > /home/hydra-import/logs/ha222-pole.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=' /home/hydra-import/logs/ha222-pole.log; grep -E 'only-bl-id|extra fields|selling price' /home/hydra-import/logs/ha222-pole.log
```

Oczekiwane: `exit=0`, `0`, `1 feed product(s) matched`, `extra fields: extra_field_<ID_POLA>="45"`.
`0 feed product(s)` = produkt nie pochodzi z tej hurtowni.

3. `hydra-import` — podgląd trzech hurtowni z marżą z pola: tabela produktów (ID, zakup, marża,
   źródło, cena przed, cena po) i czas odczytu pola, czyli tyle, ile sync będzie czytał dłużej
   (tylko odczyt):

```bash
cd /home/hydra-import/hydra-ha222 && flock -n /home/hydra-import/.hydra-run-bl.lock env BASELINKER_EXTRA_FIELD_MARGIN=<ID_POLA> npx tsx scripts/xml-to-baselinker.ts --dry-run > /home/hydra-import/logs/ha222-dryrun.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=' /home/hydra-import/logs/ha222-dryrun.log; sed -n -e '/^─── /p' -e '/margin field read/,/  feed: /p' /home/hydra-import/logs/ha222-dryrun.log
```

Oczekiwane: `exit=0`, `0`, a dla każdej hurtowni linia `margin field read (extra_field_…): N/N
matched products, C calls, T s`, `manual margin: 1 products priced from the field …` i tabela, na
górze produkt testowy z `pole` i ceną po = zakup × 1,45. **STOP — wklej wynik.**

4. `hydra-import` — **zapis jednego produktu (STOP: po akceptacji kroku 3).** Import ograniczony
   do produktu testowego, przez `--check` i pod blokadą, jak partia próbna:

```bash
cd /home/hydra-import/hydra-ha222 && scripts/server/run-bl.sh --check <hurtownia> import && flock -n /home/hydra-import/.hydra-run-bl.lock env TZ=Europe/Warsaw HA_ALLOW_PROD=1 BASELINKER_EXTRA_FIELD_MARGIN=<ID_POLA> npx tsx scripts/xml-to-baselinker.ts <hurtownia> import --only-bl-id=<ID_PRODUKTU> > /home/hydra-import/logs/ha222-jeden.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=' /home/hydra-import/logs/ha222-jeden.log; grep -E 'inventory :|margin fld|only-bl-id|selling price|Import done|manual margin|error|warn' /home/hydra-import/logs/ha222-jeden.log
```

Oczekiwane: `CHECK ok`, `exit=0`, `0`, linia `BL <ID_PRODUKTU> …: purchase X, margin 45% (field)
→ selling price Y; text_fields sent: name, description, features`, `Import done: 0 created,
1 updated, 0 errors`. Potem **w panelu**: pole „Marża %” nadal `45`, cena sprzedaży = Y =
X × 1,45. **STOP — wklej wynik i to, co widać w panelu.** Jeśli pole jest puste, BL czyści
nie wysłane pola: nie idziemy dalej, wracamy z opcjami.

5. Po akceptacji i merge'u PR-a — `hydra-import`: główny klon na `main` (jak „Aktualizacja kodu”
   w kroku 2), zmienna do `.env.local`, usunięcie kopii testowej:

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock bash -c 'git fetch origin && git switch main && git pull --ff-only && npm ci'; echo "exit=$?"; git log -1 --format='%h %ci %s'; scripts/server/run-bl.sh --check sharg sync; echo "check=$?"
```

```bash
grep -q '^BASELINKER_EXTRA_FIELD_MARGIN=' /home/hydra-import/hydra/.env.local && echo "już jest — nic nie dopisuję" || printf 'BASELINKER_EXTRA_FIELD_MARGIN=%s\n' '<ID_POLA>' >> /home/hydra-import/hydra/.env.local; grep -E '^BASELINKER_EXTRA_FIELD_MARGIN=' /home/hydra-import/hydra/.env.local; stat -c '%a %U' /home/hydra-import/hydra/.env.local
```

```bash
git -C /home/hydra-import/hydra worktree remove --force /home/hydra-import/hydra-ha222 && git -C /home/hydra-import/hydra worktree prune && git -C /home/hydra-import/hydra worktree list
```

Oczekiwane: commit z merge'em HA-2.22, `check=0`, jedna linia
`BASELINKER_EXTRA_FIELD_MARGIN=<ID_POLA>`, `600 hydra-import`, na liście worktree tylko
`/home/hydra-import/hydra`. Od tej chwili nocny import i sync czytają pole.

6. Pierwszy sync z nową logiką — **STOP, tj.** Ręcznie przez wrapper, w dzień (albo zostaw
   nocnemu cronowi i przeczytaj jego log rano):

```bash
cd /home/hydra-import/hydra && HYDRA_MAX_SECONDS=600 scripts/server/run-bl.sh kolba sync; echo "exit=$?"; L="$(ls -t /home/hydra-import/logs/kolba-sync-*.log | head -n 1)"; echo "$L"; grep -E 'margin field read|Matched|stock |prices |Sync done|manual margin|margin field: BL product|NOT written' "$L"
```

Oczekiwane: `exit=0`, `margin field read: N/N products, C calls, T s` i `manual margin: …`.
Czas `T` dolicza się do dotychczasowych 61–89 s synca (limit 600 s). Gdyby rósł w stronę limitu
albo synce zrobiły się częste (HA-2.09), wariant C z HA-2.22: jeden odczyt pola na dobę i cache.

## Wycofane produkty i normalizacja EAN (HA-2.38)

**Zerowanie.** Każdy sync po zapisie stanów i cen ustawia stan 0 w magazynie swojej hurtowni na
rekordach, które mają jej kod (prefiks SKU albo parametr `SKU <Hurtownia>`), a których kodu nie ma
w dzisiejszym feedzie — albo kod jest, ale jego pozycja feedu trafia teraz inny rekord (przeniesiona
kluczem EAN, D-D). Nic nie jest usuwane ani odpinane; inne magazyny tego rekordu się nie
zmieniają. Przy `--limit` zerowania nie ma.

**Bezpiecznik.** Feed z liczbą produktów poniżej 90% poprzedniego udanego syncu tej hurtowni →
żadnego stanu 0, w logu `[error] feed looks incomplete: N products, previous successful run M`,
`exit=1`, licznik się nie zmienia. Licznik trzyma plik `/home/hydra-import/.hydra-feed-counts.json`
(inna ścieżka: `HYDRA_FEED_COUNTS_FILE` w crontabie), zapisywany po każdym udanym syncu. Bez pliku
albo bez wpisu hurtowni (pierwszy przebieg) sync niczego nie zeruje, tylko zapisuje licznik.
Podgląd licznika — `hydra-import`:

```bash
cat /home/hydra-import/.hydra-feed-counts.json
```

**Podgląd zerowania** — tylko odczyt, bez odblokowania prod, nie zapisuje nawet pliku licznika;
pod blokadą, w dzień. `hydra-import`, `H` = `kolba`, `sharg` albo `spechurt`:

```bash
H=sharg; cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock npx tsx scripts/xml-to-baselinker.ts "$H" sync --zero-preview > /home/hydra-import/logs/zero-preview-$H.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=' /home/hydra-import/logs/zero-preview-$H.log; sed -n '/^Candidates/,$p' /home/hydra-import/logs/zero-preview-$H.log
```

Na końcu: lista rekordów (`BL id`, SKU, kod hurtowni, stan, `approved`, powód: `code missing` albo
`item matched elsewhere → <BL id>`), licznik z poprzedniego syncu i werdykt (`would zero N (approved: M)`, `feed looks incomplete` albo `no previous count`).

**Raport normalizacji EAN** — tylko odczyt; przed pierwszym przebiegiem z HA-2.38 (bramka STOP):
pary rekordów z tym samym GTIN-14 (kandydaci do scalenia — scalanie to osobna decyzja tj), EAN
w BL ze złą cyfrą kontrolną, EAN, który zapisze następny import, zmiana dopasowań feedów i kolizje
GTIN-14 w obrębie jednego feedu (pozycje, z których cenę w rekordzie zapisuje ostatnia).
`hydra-import`:

```bash
cd /home/hydra-import/hydra && flock -n /home/hydra-import/.hydra-run-bl.lock npx tsx scripts/ean-report.ts --out /home/hydra-import/ean-raport-$(date -u +%F) > /home/hydra-import/logs/ean-raport.log 2>&1; echo "exit=$?"; grep -cE 'key=|token=|client=' /home/hydra-import/logs/ean-raport.log; tail -n 3 /home/hydra-import/logs/ean-raport.log; ls /home/hydra-import/ean-raport-$(date -u +%F)
```

EAN od HA-2.38: porównanie po kluczu GTIN-14 (zera wiodące bez znaczenia), zapis do BL jako
GTIN-13; EAN o złej cyfrze kontrolnej albo długości import traktuje jak brak (w logu
`[warn] N products with an invalid EAN …`) i nie kasuje EAN, który rekord już ma. Ten sam GTIN-14 na
dwóch lub więcej pozycjach feedu jednej hurtowni to EAN niejednoznaczny: te pozycje łączą się tylko po
SKU swojej hurtowni (D-E), w logu jedna linia `[warn] N products in G groups share an EAN …`.

## Obsługa

Czy coś teraz trwa — `hydra-import`:

```bash
flock -n /home/hydra-import/.hydra-run-bl.lock true && echo wolne || cat /home/hydra-import/.hydra-run-bl.lock.holder
```

`Permission denied` znaczy, że jesteś na koncie `ubuntu`, a nie że blokada jest wolna — wejdź
przez `sudo -iu hydra-import` i powtórz. Pusta odpowiedź znaczy, że blokadę trzyma coś
uruchomionego poza wrapperem (podgląd, partia próbna albo aktualizacja kodu).

Zatrzymanie trwającego uruchomienia — `hydra-import`; sygnał do wrappera (numer procesu jest
w pliku `.holder` i w linii `START`). Wrapper zatrzymuje cały import i zapisuje `STOP` oraz `END`:

```bash
kill "$(sed -nE 's/.* pid=([0-9]+) since .*/\1/p' /home/hydra-import/.hydra-run-bl.lock.holder)"
```

Import przerwany w połowie nie zostawia szkody: następny go dokończy, bo produkty już zapisane
zostaną zaktualizowane, a nie utworzone drugi raz.

Zmiana marży: popraw `BASELINKER_MARKUP_*` w `.env.local`; najbliższy sync przeliczy ceny
wszystkich produktów tej hurtowni.

Wstrzymanie crona: zakomentuj linie w `crontab -e`. Trwającego uruchomienia to nie przerywa.

Aktualizacja kodu: krok 2, „Aktualizacja kodu”.

| Objaw w dzienniku | Znaczenie | Co zrobić |
|---|---|---|
| `SKIP lock held by another run` | przy tym harmonogramie nie powinno się zdarzać: w tym czasie szła aktualizacja kodu, podgląd, partia próbna albo ręczne uruchomienie | sprawdź, co trzymało blokadę (pole `holder`); pominięty import albo sync nie jest nadrabiany — czeka do następnej doby |
| `SKIP` przy każdym uruchomieniu, `running` rośnie | jakiś proces trzyma blokadę (zawieszone pobieranie albo czekanie na limit BaseLinkera) | jako `hydra-import`: `cat /home/hydra-import/.hydra-run-bl.lock.holder`, `ps -fu hydra-import`; decyzja tj, czy zatrzymać |
| `ERROR … not marked as the import server` / `does not name the catalogue` | brak albo pusty `~/.hydra-import-server` | krok 8, „Uzbrojenie serwera” |
| `ERROR catalogue mismatch` | `BASELINKER_INVENTORY_ID` w `.env.local` inne niż w znaczniku | popraw `.env.local`; znacznika nie zmieniaj bez decyzji tj |
| `ERROR … BASELINKER_INVENTORY_ID` / `BASELINKER_MOCK` / `production unlock` / `not readable` | błąd w `.env.local` | popraw plik, potem `--check` |
| `ERROR … must be whole seconds` / `whole number of days` | zła wartość `HYDRA_MAX_SECONDS` albo `HYDRA_LOG_KEEP_DAYS` w crontabie (np. `90m` albo komentarz w tej samej linii) | podaj samą liczbę całkowitą |
| `END exit=1 … result="[fatal] empty feed after N attempts"` (w logu `Received 0.0 MB` / `Parsed 0 products` i linie `[warn] empty feed … attempt k/N`) oraz linia `run-bl: <hurtownia> <tryb>: run ended with exit 1` w `cron-stderr.log` | hurtownia oddała pustą odpowiedź albo stronę bez produktów (HTTP 200) N razy z rzędu, co `FEED_RETRY_DELAY_S`; nic nie zostało zapisane ani odświeżone (HA-2.33) | Spechurt: feed regeneruje się do ~05:40 UTC (sekcja 7) — jeśli to noc w noc, przesuń start; inna hurtownia: sprawdź feed podglądem (sekcja 6); po naprawie ręczny import tej hurtowni poza oknem crona |
| `END exit=1 … result="Sync done: …, [error] feed looks incomplete: N products, previous successful run M"` | feed tej hurtowni ma mniej niż 90% produktów z poprzedniego udanego syncu; stany i ceny z feedu zapisane, ale **żaden** stan 0 — wycofane rekordy zostały, jak były (HA-2.38) | sprawdź feed podglądem (sekcja 6) albo `--zero-preview`; feed naprawdę mniejszy (hurtownia wycofała część oferty) → po decyzji tj usuń wpis tej hurtowni z `.hydra-feed-counts.json`, następny sync zapisze nowy licznik i zacznie zerować dobę później |
| `END exit=1` (inny `result=`) | import przerwany błędem; ostatnie linie logu zaczynają się od `[fatal]` albo `[error]` | przeczytaj log; nie wklejaj go bez `grep -c` |
| `END exit=124 … stopped-by=limit-…` | zadziałał limit czasu `HYDRA_MAX_SECONDS` | sprawdź, co trwało tak długo |
| `END … killed-by-signal=9` | proces zabity z zewnątrz, zwykle przez system z braku pamięci | jako `ubuntu`: `sudo journalctl -k --since today`, szukaj `Out of memory` |
| `WARN the previous run did not end cleanly` | poprzednie uruchomienie skończyło się bez linii `END` (restart serwera, zabity proces) | sprawdź jego log; następne uruchomienie działa normalnie |
| `END exit=0 … result="Nothing to import."` albo `result="Nothing to sync."` | tylko w dzienniku sprzed HA-2.33 (do 2026-10-19): pusty feed liczony jako sukces | dziś ten przypadek to `END exit=1 … empty feed` (wyżej); `--limit` bez produktów ze stanem daje `No in-stock products left after --limit=N` i `exit=0` |
| `END exit=0 … result="Matched 0 products, N not in BL yet"` | sync nie znalazł w katalogu żadnego produktu z feedu — import tej hurtowni jeszcze nie przeszedł | najpierw import tej hurtowni (krok 8) |
| `END exit=0 … K errors` z K większym od 0 | część produktów się nie zapisała | linie `  ⚠` w logu tego uruchomienia mówią, które i dlaczego |
| `END exit=0 … skipped: S` z S większym od 0 | BaseLinker nie oddał danych S produktów dopasowanych do katalogu (`⚠ … not returned by getInventoryProductsData — skipped`); import ich nie nadpisał, liczy je w `errors` | powtórz import tej hurtowni; jeśli te same produkty wracają, sprawdź w BL, czy produkt o tym id istnieje w katalogu 119068 |
| `WARN … look like a URL with credentials` | komunikat błędu zacytował adres feedu | przeczytaj log, usuń plik |
| `[baselinker] token blocked (rate limit)` w logu | przekroczony limit zapytań BaseLinkera; skrypt sam czeka i ponawia | nic, chyba że powtarza się stale — wtedy coś jeszcze używa tego samego tokena |

Kody wyjścia wrappera: `0` — zakończone albo pominięte; `64` — złe argumenty; `69` — brak `flock`;
`73` — nie można pisać logów ani blokady; `78` — konfiguracja albo ustawienie nie przeszły
sprawdzenia; `124` — limit czasu; `128+N` — import zabity sygnałem N; inne — kod wyjścia importu.
