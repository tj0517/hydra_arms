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
- Komendy oznaczone `ubuntu` wpisujesz po `ssh hydra-srv`; oznaczone `hydra-import` — po
  `sudo -iu hydra-import`.

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
sudo -iu hydra-import                         # wejście na konto; wyjście: exit
```

## 2. Klon repo

Do czasu merge PR-a z HA-2.15 serwer stoi na gałęzi zadania (decyzja tj 2026-10-13): wrapper i jego
test są na razie tylko tam. Skrypt importu na tej gałęzi jest taki sam jak na `main`.

Repo jest publiczne, więc klon idzie po HTTPS i konto nie potrzebuje żadnego klucza do GitHuba.

`hydra-import`:

```bash
cd ~
git clone --branch feat/ha-2.15-import-server https://github.com/tj0517/hydra_arms.git hydra
cd ~/hydra
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

**Po merge PR-a** (gdy żaden import nie trwa — patrz „Obsługa”):

```bash
cd ~/hydra
git fetch origin && git switch main && git pull --ff-only
git log -1 --format='%h %ci %s'
npm ci
scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"     # CHECK ok, exit=0
```

Ścieżki w crontabie się nie zmieniają. Tak samo wygląda każda późniejsza aktualizacja kodu
(bez `git switch`).

## 3. Zależności

`hydra-import`:

```bash
cd ~/hydra
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
| `BASELINKER_MARKUP_KOLBA` | marża w procentach od ceny zakupu |
| `BASELINKER_MARKUP_SHARG` | jw. |
| `BASELINKER_MARKUP_SPECHURT` | jw. |
| `SPECHURT_KEY` | klucz feedu Spechurtu |
| `SHARG_CLIENT` | identyfikator klienta w adresie feedu Sharga |
| `SHARG_TOKEN_FULL` | token pełnego feedu Sharga |
| `SHARG_TOKEN_GATEWAY` | token manifestu Sharga (parametry produktów) |
| `SHARG_TOKEN_LIGHT` | kod buduje z niej adres feedu „light”, ale obecny import go nie pobiera — można pominąć |

Identyfikatory konta klienta (katalog, grupy cen, magazyny) są w notatkach `docs/tasks/HA-2.26.md`
i przy O-33 w `docs/04-open-questions.md`.

Czego w pliku **nie może być**:

- `HA_ALLOW_PROD` — odblokowanie zapisu podaje się tylko na jedno uruchomienie (sekcja
  „Odblokowanie prod”); wrapper odmawia pracy, gdy znajdzie tę linię;
- `BASELINKER_MOCK` — z wartością `true` import udaje zapis i raportuje sukces; wrapper odmawia;
- `BASELINKER_WAREHOUSE_HYDRA` — puste do HA-2.09; linii nie wpisuj wcale, bo pusta wartość
  przerywa podgląd błędem;
- kluczy Supabase, Sanity, Przelewy24, Resend, `SYNC_SECRET`, `CRON_SECRET` ani zmiennych zamówień
  (`BASELINKER_ORDER_SOURCE_ID`, `BASELINKER_STATUS_*`) — import ich nie czyta.

**Uwaga na katalog.** Gdy brakuje `BASELINKER_INVENTORY_ID`, skrypt importu bierze domyślnie
katalog `35743` — żywy katalog klienta „Kobold Defense”. Wrapper nie wystartuje bez tej zmiennej,
ale komenda wpisana ręcznie, z pominięciem wrappera, tej ochrony nie ma. Dlatego pierwsze linie
każdego logu importu mają pokazywać `inventory : 119068`.

### Przeniesienie wartości

Źródłem jest `.env.local` na Macu tj (tam są identyfikatory konta klienta, zapisane w HA-2.26).
Plik pośredni zawiera tylko linie z listy wyżej; niczego nie wypisuje na ekran.

Mac, w katalogu repo:

```bash
umask 077
grep -E '^(BASELINKER_TOKEN|BASELINKER_INVENTORY_ID|BASELINKER_PRICE_GROUP|BASELINKER_PRICE_GROUP_PURCHASE|BASELINKER_WAREHOUSE_H[123]|BASELINKER_MARKUP_(KOLBA|SHARG|SPECHURT)|SPECHURT_KEY|SHARG_CLIENT|SHARG_TOKEN_(FULL|GATEWAY|LIGHT))=' .env.local > ~/hydra-import.env
grep -oE '^[A-Z][A-Z0-9_]*=' ~/hydra-import.env | sort | uniq -c    # 15 nazw, każda dokładnie raz
scp ~/hydra-import.env hydra-srv:hydra-import.env && rm ~/hydra-import.env
```

Jeśli któraś nazwa wychodzi dwa razy albo której brakuje, popraw `~/hydra-import.env` w edytorze
przed wysłaniem (przy powtórzeniu wygrywa ostatnia linia).

`ubuntu`:

```bash
sudo install -o hydra-import -g hydra-import -m 600 ~/hydra-import.env /home/hydra-import/hydra/.env.local
rm ~/hydra-import.env
```

### Sprawdzenie bez wypisywania wartości

`hydra-import`:

```bash
E=~/hydra/.env.local
stat -c '%a %U:%G' "$E"                                    # 600 hydra-import:hydra-import
grep -oE '^[A-Z][A-Z0-9_]*=' "$E" | sort | uniq -c         # 15 nazw z tabeli, każda raz
grep -cvE '^[A-Z][A-Z0-9_]*=.|^[[:space:]]*#|^[[:space:]]*$' "$E"   # 0 — brak pustych wartości i obcych linii
for kv in BASELINKER_INVENTORY_ID=119068 BASELINKER_PRICE_GROUP=104511 BASELINKER_PRICE_GROUP_PURCHASE=104512 BASELINKER_WAREHOUSE_H1=bl_157483 BASELINKER_WAREHOUSE_H2=bl_157484 BASELINKER_WAREHOUSE_H3=bl_157485; do
  printf '%s : %s\n' "$kv" "$(grep -cE "^${kv%%=*}=[\"']?${kv#*=}[\"']?[[:space:]]*(#.*)?\$" "$E")"
done                                                        # sześć razy „: 1”
grep -cE '=["'"'"']?(107789|bl_14860[234])' "$E"            # 0 — nic z sandboxa
```

Zgodności tokena nie da się sprawdzić bez wypisania go — potwierdzi ją dopiero pierwszy import
(BaseLinker odrzuci zapis do katalogu, którego token nie widzi).

## 5. Wrapper, znacznik serwera, samosprawdzenie

Cron i ręczne uruchomienia importu idą przez `scripts/server/run-bl.sh <hurtownia> <tryb>`
(`kolba|sharg|spechurt`, `import|sync`). Wrapper:

- trzyma jedną blokadę (`flock -n`) na cały serwer — gdy trwa inne uruchomienie, nowe kończy się
  od razu kodem 0 i linią `SKIP` w dzienniku, niczego nie wypisując;
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
cd ~/hydra

# a) Samosprawdzenie wrappera. Bezpieczne: tylko komendy zastępcze w katalogu tymczasowym.
bash scripts/server/test-run-bl.sh | tail -n 3          # passed: 78, failed: 0

# b) Red proof znacznika: bez znacznika wrapper odmawia i niczego nie uruchamia.
scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"
#    … ERROR this machine is not marked as the import server … ; exit=78

# c) Oznaczenie serwera — raz. Znacznik podaje katalog, do którego ten serwer ma prawo pisać.
printf 'inventory=119068\n' > ~/.hydra-import-server

# d) Sprawdzenie konfiguracji — nadal niczego nie uruchamia. Druga komenda sprawdza to samo
#    w otoczeniu takim, jakie daje cron.
scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"
env -i HOME="$HOME" PATH=/usr/bin:/bin scripts/server/run-bl.sh --check sharg sync; echo "exit=$?"
#    … CHECK ok — nothing was run. A real run would start in /home/hydra-import/hydra:
#      /home/hydra-import/hydra/node_modules/.bin/tsx scripts/xml-to-baselinker.ts sharg sync
#      (catalogue 119068, limit none, lock /home/hydra-import/.hydra-run-bl.lock) ; exit=0
```

Wklej wyniki a), b) i d).

Znacznik robi dwie rzeczy. Odróżnia serwer od komputera, na którym wrapper uruchomiony przez
pomyłkę zapisałby do produkcyjnego BaseLinkera — nie zakładamy go na żadnej innej maszynie.
I przypina katalog: jeśli `BASELINKER_INVENTORY_ID` w `.env.local` kiedykolwiek będzie inne niż
`119068` (literówka, stara linia, podwójny wpis), wrapper odmówi z komunikatem
`catalogue mismatch`.

## Logi

Katalog `/home/hydra-import/logs` (tryb 700, pliki 600):

| Plik | Co zawiera |
|---|---|
| `<hurtownia>-<tryb>-<RRRRMMDD-GGMMSS>.log` | pełne wyjście jednego uruchomienia; pierwsza i ostatnia linia od wrappera (start; koniec z kodem wyjścia i czasem) |
| `run-bl-<RRRR-MM>.log` | dziennik: jedna linia na `START`, `END`, `SKIP`, `STOP`, `ERROR`, `WARN` |
| `preview-<hurtownia>.log` | podglądy uruchamiane ręcznie (krok 6) |

Czasy w logach i dzienniku są polskie (`+0200` latem, `+0100` zimą), choć zegar serwera chodzi
w UTC: wrapper uruchamia import w strefie Europe/Warsaw, bo BaseLinker podaje koniec blokady
limitu zapytań w czasie polskim.

Rotacja (decyzja tj 2026-10-13): wrapper przy starcie kasuje własne pliki starsze niż 30 dni —
tylko te o dokładnie jego nazwach: `<hurtownia>-<import|sync>-<8 cyfr>-<6 cyfr>.log` oraz
`run-bl-<RRRR-MM>.log`. Niczego innego w `~/logs` nie rusza; podglądy i własne notatki usuwasz
ręcznie. Inną retencję ustawia `HYDRA_LOG_KEEP_DAYS` w crontabie (liczba całkowita).

```bash
tail -n 20 ~/logs/run-bl-$(date +%Y-%m).log              # co się działo ostatnio
grep -E 'ERROR|WARN|exit=[1-9]' ~/logs/run-bl-*.log       # wszystko, co nie poszło gładko
tail -f "$(ls -t ~/logs/sharg-import-*.log | head -n 1)"  # trwający import Sharga
grep -cE 'key=|token=' ~/logs/*.log                       # 0 przy każdym pliku
```

Jak czytać dziennik:

```
… sharg import pid=4242 START catalogue=119068 commit=abc1234 limit=none log=/home/hydra-import/logs/sharg-import-20261014-020001.log
… sharg import pid=4242 END exit=0 duration=1820s url-credentials=0 result="Import done: 2280 created, 0 updated, 0 errors" log=…
… sharg sync pid=4311 SKIP lock held by another run — skipping (holder: sharg import pid=4242 since …, running 12 min)
```

- `result="…"` to podsumowanie samego importu. Import kończy się kodem 0 także wtedy, gdy część
  produktów się nie zapisała — liczbę błędów widać właśnie tu. `result="none"` przy `exit=0`
  znaczy, że import nie doszedł do podsumowania.
- `url-credentials=N` to liczba linii logu wyglądających na adres z danymi dostępowymi.
  Oczekiwane `0`. Przy innej wartości wrapper dopisuje `WARN` — przeczytaj log, a potem go usuń
  (decyzja tj 2026-10-13: wrapper tylko wykrywa, niczego nie zamazuje).
- `stopped-by=…` — uruchomienie zatrzymane limitem czasu albo sygnałem; `killed-by-signal=9` —
  proces zabity z zewnątrz, najczęściej przez system z braku pamięci.

Plik blokady to `~/.hydra-run-bl.lock`; kto ją trzyma, mówi `~/.hydra-run-bl.lock.holder`.
Żaden z nich nie leży w `~/logs`, więc sprzątanie logów nie zdejmie blokady.

Wrapper nic nie wypisuje, gdy uruchomienie się udało albo zostało pominięte. Odmowy i nieudane
uruchomienia wypisuje też na stderr, więc cron może je zgłosić. Innych powiadomień nie ma
(monitoring jest w deferred).

## 6. Podgląd i pomiar pamięci

Podgląd pobiera prawdziwy feed, liczy przyjęte i odrzucone produkty i niczego nie zapisuje.
Zaczynamy od Sharga, bo ma największy feed. Serwer ma 3,8 GB RAM, nie ma swapu, a Node domyślnie
pozwala na 1956 MB sterty.

`hydra-import`:

```bash
mkdir -p ~/logs && chmod 700 ~/logs
cd ~/hydra
P=~/logs/preview-sharg.log
/usr/bin/time -v npx tsx scripts/xml-to-baselinker.ts sharg --dry-run > "$P" 2>&1; echo "exit=$?"
grep -cE 'key=|token=' "$P"                   # musi być 0, zanim cokolwiek wkleisz
grep -E '^(Received|Parsed)|Defence filter|no category mapping|permit (tags|groups)' "$P"
sed -n '/DRY-RUN SUMMARY/,$p' "$P"
```

Wynik idzie do pliku, a nie na ekran, żeby `grep -c` dało się policzyć przed pokazaniem treści.

Co odczytać:

- **liczby**: `feed: N admitted: A dropped: D`, powody odrzucenia (`no_stock`, `not_p1`),
  `no category mapping`, tabela `Admitted by Hydra section`;
- **szczyt pamięci**: linia `Maximum resident set size (kbytes)` z wyjścia `time`. To największy
  pojedynczy proces (Node ze skryptem); procesy pośrednie `npx` i `tsx` dokładają ok. 150 MB;
- **czas**: `Elapsed (wall clock) time`.

**STOP — pamięć.** Wklej trzy komendy wynikowe dla Sharga. Jeśli szczyt przekracza
ok. 2 500 000 kB albo podgląd kończy się komunikatem `JavaScript heap out of memory` (to limit
sterty Node, nie brak RAM-u), nie próbuj dalej i nie uruchamiaj pozostałych hurtowni — czekasz na
opcje. To samo, gdy Sharg odpowie błędem zamiast feedu (`Feed fetch failed`, `Parsed 0 products`):
pobieranie serwer–serwer nie było jeszcze u Sharga potwierdzone.

Po zgodzie — Kolba i Spechurt, każda osobno (zmień `sharg` w nazwie pliku i w komendzie na `kolba`,
potem `spechurt`).

**STOP — liczby.** Wklej wyniki trzech podglądów. Z nich powstaje propozycja harmonogramu,
a przed importem każdej hurtowni akceptujesz jej liczby.

Gdy cron już działa, podgląd uruchamiaj pod tą samą blokadą co import, żeby dwa parsowania nie
zderzyły się w pamięci:

```bash
cd ~/hydra && flock -n ~/.hydra-run-bl.lock npx tsx scripts/xml-to-baselinker.ts sharg --dry-run > ~/logs/preview-sharg.log 2>&1; echo "exit=$?"
# exit=1 od razu i pusty plik = trwa import albo sync; spróbuj później
```

## 7. Harmonogram

**Do uzupełnienia po podglądach — decyzja tj (STOP).** Propozycja powstanie z liczb z kroku 6:
czas importu to ok. 0,7 s na przyjęty produkt plus pobranie i parsowanie feedu.

Co już wiadomo:

- blokada jest jedna na serwer, więc import i sync nigdy nie idą równocześnie; uruchomienie, które
  trafi na zajętą blokadę, jest pomijane, a nie kolejkowane;
- Spechurt generuje stan raz na dobę między 3:00 a 4:00 czasu polskiego; feed odświeża co ok. 3 h
  (zapis z `docs/tasks/HA-2.15.md`);
- dla Kolby i Sharga częstotliwości odświeżania feedu nie ma w dokumentach;
- sync Sharga pobiera pełny feed (taki sam jak import), nie lekki;
- cron na Ubuntu 26.04 nie ma stref czasowych per użytkownik: godziny w crontabie są w strefie
  systemu, dziś UTC. Czas polski to UTC+2 latem i UTC+1 zimą (zmiana 2026-10-25).

## 8. Pierwszy import na żywo

Kolejność hurtowni: z decyzji o harmonogramie. Ma znaczenie, bo produkt o tym samym EAN u dwóch
hurtowni to w BaseLinkerze jeden produkt, a jego nazwę, opis i cenę nadpisuje ta hurtownia, która
importuje później.

Warunki wstępne — wszystkie naraz:

1. sklep nie sprzedaje (notatka tj z 2026-10-06: import z marżą wstępną tylko wtedy);
2. **STOP — O-33.** Klient nie odpowiedział, czym są integracje „hydra-arms.co…” i HYDRA-ARMS
   (Allegro) na koncie BaseLinkera ani czy Sharg ma iść naszym importem, czy przez Base Connect
   „SHARG (Hurtownia)”. Decyzja tj, czy importujemy mimo to;
3. podgląd danej hurtowni z kroku 6 zaakceptowany przez tj;
4. `scripts/server/run-bl.sh --check <hurtownia> import` kończy się `CHECK ok`;
5. crontab **nie jest** jeszcze zainstalowany (krok 10) — inaczej pierwszy import zrobiłby się sam
   w nocy, bez akceptacji.

**STOP — przed każdą hurtownią.** Import danej hurtowni uruchamiasz dopiero po zgodzie.

Opcjonalnie najpierw mała partia, żeby obejrzeć kilka produktów w panelu BaseLinkera (jedyna
komenda poza wrapperem; odblokowanie stoi na początku tej jednej linii):

```bash
cd ~/hydra
HA_ALLOW_PROD=1 npx tsx scripts/xml-to-baselinker.ts sharg import --limit=20 > ~/logs/proba-sharg-import.log 2>&1; echo "exit=$?"
head -n 12 ~/logs/proba-sharg-import.log              # MUSI pokazać: inventory : 119068
grep -E 'Filtered|Assortment filter|Import done' ~/logs/proba-sharg-import.log
```

`--limit=20` bierze pierwsze 20 produktów ze stanem, a dopiero potem filtr asortymentu, więc
zapisanych może być mniej niż 20.

Pełny import — w tle, żeby zerwane połączenie SSH go nie przerwało:

```bash
cd ~/hydra
nohup scripts/server/run-bl.sh sharg import > /dev/null 2>&1 &
sleep 5; tail -n 2 ~/logs/run-bl-$(date +%Y-%m).log      # linia START z nazwą logu
LOG="$(ls -t ~/logs/sharg-import-*.log | head -n 1)"
head -n 12 "$LOG"                                        # MUSI pokazać: inventory : 119068
tail -f "$LOG"                                           # „+” nowy produkt, „.” aktualizacja; Ctrl-C kończy tylko podgląd
```

Wrapper nie wystartuje z innym katalogiem niż `119068` (pilnuje tego znacznik), a linia `START`
w dzienniku ma `catalogue=119068`. Gdyby mimo to log pokazał coś innego albo import trzeba było
przerwać: zatrzymanie opisuje sekcja „Obsługa”. Między startem a pierwszym zapisem jest pobranie
i parsowanie feedu, więc jest na to czas.

Po zakończeniu wklej:

```bash
tail -n 3 ~/logs/run-bl-$(date +%Y-%m).log               # END exit=0 … url-credentials=0 result="Import done: …"
grep -cE 'key=|token=' "$LOG"                            # 0
grep -E '^(Received|Parsed)|Assortment filter|no_stock|not_p1|Category resolution|Import done|tags:|purchase price|price 0' "$LOG"
grep -c '⚠' "$LOG"                                       # liczba ostrzeżeń
```

Do odczytania: `✓ Import done: N created, M updated, K errors`, liczby tagów, ostrzeżenia
o cenach (`no purchase price` — cena z feedu zamiast marży; `price 0` — produkt bez ceny).

Nic nie publikuje się samo: sklep pokazuje tylko produkty z tagiem `approved`.

### Red proof blokady na serwerze

W trakcie trwającego importu, z drugiej sesji (`hydra-import`):

```bash
~/hydra/scripts/server/run-bl.sh sharg sync; echo "exit=$?"     # exit=0 od razu
tail -n 3 ~/logs/run-bl-$(date +%Y-%m).log
```

Oczekiwane: linia `START` trwającego importu, potem `SKIP lock held by another run — skipping
(holder: sharg import …)`. Wklej je razem z późniejszą linią `END` importu.

## 9. Pierwszy sync

Po imporcie wszystkich trzech hurtowni. `sync` odświeża stan w magazynie hurtowni i cenę
sprzedaży produktów, które już są w katalogu; niczego nie tworzy.

`hydra-import`, dla każdej hurtowni:

```bash
cd ~/hydra
scripts/server/run-bl.sh sharg sync; echo "exit=$?"
LOG="$(ls -t ~/logs/sharg-sync-*.log | head -n 1)"
grep -cE 'key=|token=' "$LOG"                            # 0
grep -E 'Matched|stock |prices |Sync done|purchase price|price 0' "$LOG"
```

Do odczytania: `Matched N products`, linie `stock …: X updated` i `prices …: X updated`,
`✓ Sync done: N products refreshed`.

Każdy sync i każdy import **nadpisuje cenę sprzedaży** wyliczoną z ceny zakupu i marży z pliku
env. Cena poprawiona ręcznie w BaseLinkerze nie przetrwa najbliższego uruchomienia (pytanie O-32
jest otwarte).

## 10. Crontab

**Do uzupełnienia — dokładną treść akceptuje tj przed wpisaniem (STOP).** Powstanie po decyzji
o harmonogramie.

Co będzie pewne niezależnie od godzin:

- crontab należy do konta `hydra-import` (`crontab -e` po `sudo -iu hydra-import`;
  `crontab -l` na koncie `ubuntu` zostaje pusty);
- każda linia woła tylko `/home/hydra-import/hydra/scripts/server/run-bl.sh <hurtownia> <tryb>` —
  blokadę, logi i odblokowanie prod załatwia wrapper; linie nie zawierają `HA_ALLOW_PROD`;
- wrapper milczy przy powodzeniu i przy pominięciu, a odmowy i błędy wypisuje na stderr; czy
  cron ma dokąd je wysłać, ustalimy razem z treścią crontaba — źródłem prawdy zostaje dziennik;
- instalujesz go **po** kroku 9, nie wcześniej.

## Odblokowanie prod

Skrypt importu odmawia zapisu do BaseLinkera, dopóki w otoczeniu **tego jednego procesu** nie ma
`HA_ALLOW_PROD=1`.

- **Przez wrapper** (cron i zwykłe uruchomienia ręczne) niczego nie dopisujesz: wrapper ustawia
  zmienną wyłącznie dla procesu importu, a odziedziczoną z otoczenia usuwa.
- **Bez wrappera** — tylko mała partia próbna z kroku 8 — zmienna stoi na początku tej jednej
  komendy.
- Nigdy w `.env.local`, w `~/.profile`, `~/.bashrc` ani w nagłówku crontaba.

## 11. Porządki — propozycja

Decyduje i usuwa tj. Wszystko poniżej leży na koncie `ubuntu` i po wdrożeniu nie jest potrzebne
importowi.

| Co | Dlaczego |
|---|---|
| `/home/ubuntu/hydra/.env.local` | tryb 644; trzyma klucz Supabase service role, token Sanity, klucz Resend i stare dane BaseLinkera — żaden z nich nie jest potrzebny na serwerze (O-19, opcja B) |
| cały `/home/ubuntu/hydra` | stary klon z lipca: kod bez filtra i bezpieczników, `hydra-categories.json` z ID sandboxa, 926 pakietów; uruchomiony przez pomyłkę pisałby według starego pliku env |
| `/home/ubuntu/hydra/scripts/count-adhoc.ts` | nieśledzony skrypt, treść nieznana — obejrzyj przed usunięciem klonu |
| `~/spechurt-import.log` | log importu z lipca; 1 linia z kluczem lub tokenem w adresie |
| `~/spechurt.xml`, `~/spechurt-2026-09-26.xml` | pełne feedy Spechurtu z cenami zakupu (18,8 MB i 17,4 MB); import pobiera feed sam |
| `~/.bash_history` | mogą w niej być komendy z adresem feedu; sprawdź `grep -cE 'key=|token=' ~/.bash_history` i przy wyniku innym niż 0 wyczyść historię |
| klucz w `~/.ssh` używany do GitHuba | nowe konto klonuje publiczne repo po HTTPS; sprawdź `ssh -T git@github.com`, czyj to klucz — jeśli osobisty z prawem zapisu, zdejmij go z serwera i z GitHuba |

Tokeny Sharga i klucz Spechurtu są też w publicznym repo (migracja 004 i próbka manifestu) —
usunięcie plików z serwera tego nie zmienia; zmienia to dopiero rotacja u hurtowni (ryzyko
zaakceptowane w HA-1.02, wpis w `docs/deferred-tasks.md`).

## Obsługa

Czy coś teraz trwa:

```bash
flock -n ~/.hydra-run-bl.lock true && echo wolne || cat ~/.hydra-run-bl.lock.holder
```

Zatrzymanie trwającego uruchomienia — sygnał do wrappera (numer procesu jest w pliku `.holder`
i w linii `START`). Wrapper zatrzymuje cały import i zapisuje `STOP` oraz `END`:

```bash
kill "$(sed -nE 's/.* pid=([0-9]+) since .*/\1/p' ~/.hydra-run-bl.lock.holder)"
```

Import przerwany w połowie nie zostawia szkody: następny go dokończy, bo produkty już zapisane
zostaną zaktualizowane, a nie utworzone drugi raz.

Zmiana marży: popraw `BASELINKER_MARKUP_*` w `.env.local`; najbliższy sync przeliczy ceny
wszystkich produktów tej hurtowni.

Wstrzymanie crona: zakomentuj linie w `crontab -e`. Trwającego uruchomienia to nie przerywa.

| Objaw w dzienniku | Znaczenie | Co zrobić |
|---|---|---|
| `SKIP lock held by another run` raz | poprzednie uruchomienie jeszcze trwało | nic; następne okno nadrobi |
| `SKIP` przy każdym uruchomieniu, `running` rośnie | jakiś proces trzyma blokadę (zawieszone pobieranie albo czekanie na limit BaseLinkera) | `cat ~/.hydra-run-bl.lock.holder`, `ps -fu hydra-import`; decyzja tj, czy zatrzymać |
| `ERROR … not marked as the import server` / `does not name the catalogue` | brak albo pusty `~/.hydra-import-server` | krok 5 |
| `ERROR catalogue mismatch` | `BASELINKER_INVENTORY_ID` w `.env.local` inne niż w znaczniku | popraw `.env.local`; znacznika nie zmieniaj bez decyzji tj |
| `ERROR … BASELINKER_INVENTORY_ID` / `BASELINKER_MOCK` / `production unlock` / `not readable` | błąd w `.env.local` | popraw plik, potem `--check` |
| `ERROR … must be whole seconds` / `whole number of days` | zła wartość `HYDRA_MAX_SECONDS` albo `HYDRA_LOG_KEEP_DAYS` w crontabie (np. `90m`) | podaj liczbę całkowitą |
| `END exit=1` | import przerwany błędem; ostatnie linie logu zaczynają się od `[fatal]` albo `[error]` | przeczytaj log; nie wklejaj go bez `grep -c` |
| `END exit=124 … stopped-by=limit-…` | zadziałał limit czasu `HYDRA_MAX_SECONDS` | sprawdź, co trwało tak długo |
| `END … killed-by-signal=9` | proces zabity z zewnątrz, zwykle przez system z braku pamięci | jako `ubuntu`: `sudo journalctl -k --since today`, szukaj `Out of memory` |
| `WARN the previous run did not end cleanly` | poprzednie uruchomienie skończyło się bez linii `END` (restart serwera, zabity proces) | sprawdź jego log; następne uruchomienie działa normalnie |
| `END exit=0 … result="none"`, w logu `Nothing to import.` albo `Parsed 0 products` | hurtownia oddała pustą odpowiedź albo stronę błędu | sprawdź podglądem; Spechurt odpowiada tylko temu serwerowi |
| `WARN … look like a URL with credentials` | komunikat błędu zacytował adres feedu | przeczytaj log, usuń plik |
| `[baselinker] token blocked (rate limit)` w logu | przekroczony limit zapytań BaseLinkera; skrypt sam czeka i ponawia | nic, chyba że powtarza się stale — wtedy coś jeszcze używa tego samego tokena |

Kody wyjścia wrappera: `0` — zakończone albo pominięte; `64` — złe argumenty; `69` — brak `flock`;
`73` — nie można pisać logów ani blokady; `78` — konfiguracja albo ustawienie nie przeszły
sprawdzenia; `124` — limit czasu; `128+N` — import zabity sygnałem N; inne — kod wyjścia importu.
