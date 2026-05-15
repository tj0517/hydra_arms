# Codebase Refactor Plan — Consistency & Component Extraction

## What the audit found

### 1. Horizontal padding — almost consistent, but not fully
Every section uses `px-[clamp(32px,5vw,64px)]` for horizontal padding.
**Two exceptions:**
- Grid containers use `mx-[clamp(32px,5vw,64px)]` (correct, gives border-to-border grid)
- `Footer.tsx` uses `px-8 md:px-16` — completely different, needs aligning

**Fix:** Define a single Tailwind token or CSS variable `--px-section: clamp(32px, 5vw, 64px)` and apply to Footer too.

---

### 2. Heading hierarchy — inconsistent at the same semantic level

There are currently 4 different sizes being used for h2 section headings:

| Current size | Used for | Should be |
|---|---|---|
| `clamp(1.75rem, 9.26vw, 140px)` | PARTNERSTWA STRATEGICZNE, DLA KOGO PRACUJEMY | **Display** — keep, intentional |
| `clamp(1.75rem, 4.76vw, 72px)` | Nasze Kompetencje, Kluczowe Korzyści | **Section H2** — keep |
| `clamp(1.5rem, 3.17vw, 48px)` | Fundamenty (Wspolpraca + ONas), Nasza Misja | **Panel H2** — keep |
| `clamp(1.25rem, 3vw, 28px)` | Kodeks Etyki, Fundamenty card titles | **h3 only** — this is a sub-panel, should never be h2 |

**Problems identified:**
- `Kodeks Etyki` on Wspolpraca: uses h2 with `28px` max — same layout role as Nasza Misja (ONas) which uses `48px`. These are the same pattern — both need to be `clamp(1.5rem, 3.17vw, 48px)`.
- `DrawReveal` card titles use h3 `text-[20px] md:text-[28px]` — consistent, no change needed.
- Tab content titles (inside Kluczowe Korzyści, Nasze Kompetencje): both use h3 `clamp(1.5rem, 3.17vw, 48px)` — consistent, no change needed.

**Fix:** Align Kodeks Etyki h2 from `28px` → `clamp(1.5rem, 3.17vw, 48px)` to match its structural equivalent (Nasza Misja).

---

### 3. Repeated patterns built from scratch (highest priority)

#### A. Corner-bordered CTA button — 15+ instances
```tsx
<div className="relative px-6 py-1.5 inline-flex items-center w-fit">
  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-text/50" />
  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-text/50" />
  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-text/50" />
  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-text/50" />
  <ScrambleLink href={...} className="font-[var(--font-mono)] text-[14px] tracking-[1.12px]">
    Label text
  </ScrambleLink>
</div>
```
→ Extract to `src/components/ui/CornerCTA.tsx`

#### B. Intro/description block — 6 instances (all pages, multiple sections)
```tsx
<section className="py-20 md:py-32 px-[clamp(32px,5vw,64px)]">
  <ScrollRevealText text={...} className="text-[1.4rem] md:text-[3.2vw] ..." indent={2} />
  <div className="flex justify-end mt-11">
    <CornerCTA href={...} label={...} />
  </div>
</section>
```
→ Extract to `src/components/sections/IntroBlock.tsx`

#### C. Client segments 3-column grid — appears identically in 3 pages
`HomePageClient`, `ONasPageClient`, `UslugiPageClient` all define `clientSegments[]` locally and render the same grid markup. ONas and Uslugi even copy the same data array.
→ Extract to `src/components/sections/ClientSegmentsGrid.tsx`
→ Single shared `clientSegments` data source

#### D. Tab section — appears in 2 pages with same structure
`UslugiPageClient` (Nasze Kompetencje) and `WspolpracaPageClient` (Kluczowe Korzyści) both have:
- Monospace `[tab.label]` nav with active accent
- Counter badge
- h3 title + description + CTA
→ Extract to `src/components/sections/TabbedSection.tsx`

#### E. Section label row — appears on most sections
```tsx
<div className="border-t border-white/[0.25] px-[clamp(32px,5vw,64px)] py-2">
  <span className="font-[var(--font-mono)] text-[16px] font-medium text-accent tracking-[0.8px]">
    //01 LABEL
  </span>
</div>
```
→ Extract to `src/components/ui/SectionLabel.tsx`

---

## Proposed implementation order

### Phase 1 — Tokens & trivial consistency (low risk, high impact)
1. Add `--px-section` CSS variable in `globals.css`
2. Fix Footer padding to use same horizontal rhythm
3. Fix Kodeks Etyki h2 size to match Nasza Misja

### Phase 2 — Atomic UI components (no layout changes)
4. `CornerCTA` — replaces 15 inline instances
5. `SectionLabel` — replaces 8 inline instances

### Phase 3 — Section components (layout preserved exactly)
6. `IntroBlock` — replaces 6 copy-paste intro sections
7. `ClientSegmentsGrid` — replaces 3 duplicated grids
8. `TabbedSection` — replaces 2 tab section blocks

### Phase 4 — Cleanup
9. Remove duplicate `clientSegments` data from ONas and Uslugi (shared from one place)
10. Verify all pages still render identically

---

## Files that will change

| File | Change |
|---|---|
| `src/app/globals.css` | Add `--px-section` token |
| `src/components/Footer.tsx` | Fix horizontal padding |
| `src/components/WspolpracaPageClient.tsx` | Fix Kodeks Etyki h2 size |
| `src/components/ui/CornerCTA.tsx` | **New** |
| `src/components/ui/SectionLabel.tsx` | **New** |
| `src/components/sections/IntroBlock.tsx` | **New** |
| `src/components/sections/ClientSegmentsGrid.tsx` | **New** |
| `src/components/sections/TabbedSection.tsx` | **New** |
| `HomePageClient.tsx`, `ONasPageClient.tsx`, `UslugiPageClient.tsx`, `WspolpracaPageClient.tsx` | Replace inline patterns with new components |
