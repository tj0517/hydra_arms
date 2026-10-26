# Marża produktu ustawiana w BaseLinkerze — instrukcja

Dotyczy katalogu „Hydra arms” w BaseLinkerze (HA-2.22). Krótko: **zmieniasz marżę, a nie cenę.**
Cenę sprzedaży co noc liczy import z ceny zakupu u hurtowni.

## Jak liczona jest cena

Cena sprzedaży = cena zakupu u hurtowni × (1 + marża / 100).

- Domyślna marża to **30 %** dla każdej hurtowni.
- Produkt, który ma wypełnione pole **„Marża %”**, dostaje swoją marżę zamiast domyślnej.

Przykład: cena zakupu 100 zł. Pole „Marża %” puste → 130 zł. Pole „Marża %” = 45 → 145 zł.

## Jak ustawić marżę produktu

1. W BaseLinkerze otwórz produkt w katalogu „Hydra arms” do edycji.
2. W polach dodatkowych znajdź **„Marża %”** i wpisz liczbę od 0 do 200. Każdy z tych zapisów
   znaczy to samo: `45`, `45%`, `45,5`, `45.5`.
3. Zapisz produkt.

Powrót do marży domyślnej (30 %): wyczyść pole „Marża %” i zapisz.

Wartość, której nie da się odczytać jako liczby od 0 do 200 (np. `abc`, `-5`, `250`), jest
pomijana. Produkt dostaje wtedy marżę domyślną, a my widzimy ostrzeżenie w dzienniku importu.

## Kiedy zmiana zadziała

Nowa cena pojawi się w BaseLinkerze przy najbliższym nocnym przebiegu hurtowni, od której
pochodzi produkt. Liczy ją zarówno import, jak i aktualizacja cen i stanów (sync). W sklepie
internetowym będzie widoczna po najbliższym kopiowaniu katalogu.

| Hurtownia | Import (zima / lato) | Aktualizacja cen i stanów (zima / lato) |
|---|---|---|
| Kolba | 21:20 / 22:20 | 23:55 / 00:55 |
| Sharg | 00:15 / 01:15 | 01:50 / 02:50 |
| Spechurt | 05:35 / 06:35 | 07:50 / 08:50 |

Godziny są w czasie polskim. Sklep kopiuje katalog z BaseLinkera raz na dobę, o **03:00 zimą /
04:00 latem**. Marża zmieniona w ciągu dnia jest więc w sklepie następnego ranka. Wyjątek to
produkty Spechurtu: ich ceny zmieniają się w BaseLinkerze po kopiowaniu, więc w sklepie
pojawiają się dzień później.

## Ważne

- **Nie zmieniaj ręcznie ceny sprzedaży.** Każdej nocy import liczy ją od nowa z ceny zakupu
  i marży, więc ręcznie wpisana cena zniknie. Żeby zmienić cenę, zmień marżę.
- Tak samo co noc nadpisywane są ręczne zmiany nazwy i opisu produktu. Pole „Marża %” import
  tylko odczytuje, nigdy go nie zmienia.
- **Produkt bez ceny zakupu w hurtowni:** marża nie działa, cena pochodzi z cennika hurtowni.
- **Produkt oferowany przez dwie hurtownie** (ten sam kod EAN) to w BaseLinkerze jeden produkt.
  Jego marża z pola obowiązuje przy każdej z tych hurtowni. Cena zakupu pochodzi od tej, która
  aktualizowała produkt ostatnia.
- Zmiana marży nie zmienia od razu ceny zakupu ani stanów — te też odświeżają się w nocy.
