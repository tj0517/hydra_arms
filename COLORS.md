# Paleta kolorów — Hydra Arms Web

Kolory zdefiniowane jako zmienne CSS w `src/app/globals.css` (sekcja `@theme inline`).

---

## Kolory podstawowe

| Zmienna | Wartość hex | Podgląd | Opis |
|---|---|---|---|
| `--color-bg` | `#0A0A0B` | ⬛ | **Tło główne** — głęboka, niemal czysta czerń z delikatnym odcieniem granatowym. Używane jako tło całej strony oraz paska przewijania. |
| `--color-bg-light` | `#0A0A0A` | ⬛ | **Tło jasne** — czysta czerń, minimalnie jaśniejszy wariant tła głównego. |
| `--color-bg-card` | `#0F0F0F` | ⬛ | **Tło kart** — bardzo ciemna szarość używana jako tło komponentów, kart i paneli. |
| `--color-text` | `#E0F2F1` | 🔲 | **Tekst główny** — jasna biel z subtelnym, zimnym odcieniem morskim. Domyślny kolor wszystkich tekstów. |
| `--color-text-dim` | `#C0C8C7` | 🔲 | **Tekst stonowany** — chłodna, przygaszona szarość. Używana do podpisów, metadanych i mniej ważnych informacji. |
| `--color-accent` | `#13FF15` | 🟩 | **Akcent** — intensywna elektryczna zieleń (neon). Kluczowy kolor marki — kursor, scrollbar, obramowania kart, podkreślenia linków, efekty glitch. |
| `--color-white` | `#FFFFFF` | ⬜ | **Biały** — czysty biały, stosowany tam gdzie wymagana jest pełna jasność. |

---

## Kolory pomocnicze (inline, nie jako zmienne)

Kolory używane bezpośrednio w kodzie CSS bez własnych zmiennych:

| Wartość | Kontekst użycia |
|---|---|
| `rgba(192, 200, 199, 0.25)` | Linie siatki bocznej (`.lines-grid`) — półprzezroczysty wariant `--color-text-dim` |
| `rgba(255, 255, 255, 0.02)` | Nakładka skanlinii (`.ls-scanlines`) — prawie niewidoczna biel |
| `rgba(255, 255, 255, 0.1)` | Dolna linia separatora kart (`.draw-reveal-border`) |
| `rgba(19, 255, 21, 0.06–0.15)` | Błyski efektu glitch (`.ls--glitch`, `heroLoopFlash`) — półprzezroczysta zieleń akcentu |
| `#000000` | Tło ekranu ładowania (`.ls`) — czysta czerń |
| `#0A8F0B` | Cień tekstu w efekcie glitch — ciemna, zgaszona zieleń |
| `#7FFF80` | Cień tekstu w efekcie glitch — jasna, miętowa zieleń |

---

## Użycie kolorów w interfejsie

```
Tło strony      →  --color-bg       (#0A0A0B)
Tło kart/paneli →  --color-bg-card  (#0F0F0F)
Teksty główne   →  --color-text     (#E0F2F1)
Teksty drugopł. →  --color-text-dim (#C0C8C7)
Akcenty / UI    →  --color-accent   (#13FF15)
```

---

## Typografia

Fonty ładowane przez `next/font/google` w `src/app/layout.tsx`, eksponowane jako zmienne CSS w `@theme inline` (`globals.css`).

### Kroje pisma

| Zmienna CSS | Font | Źródło | Grubości |
|---|---|---|---|
| `--font-main` | **Outfit** | Google Fonts | 300, 400, 500, 600, 700 |
| `--font-mono` | **JetBrains Mono** | Google Fonts | 400, 700 |

### Zastosowanie

| Zmienna | Gdzie używane |
|---|---|
| `--font-main` | Domyślny font całej strony (`body`), nagłówki, przyciski, nawigacja, opisy produktów (`.shop-description`) |
| `--font-mono` | Ekran ładowania (`.ls`), etykiety terminala, tagi kodu, elementy UI o charakterze technicznym |

### Zmienne pomocnicze (Next.js → CSS)

```
next/font/google → CSS variable  → Tailwind alias
Outfit           → --font-outfit  → --font-main
JetBrains_Mono   → --font-jetbrains-mono → --font-mono
```

> Fonty są dołączane do klasy `<body>` jako `outfit.variable` i `jetbrainsMono.variable` w `src/app/layout.tsx:77`.
