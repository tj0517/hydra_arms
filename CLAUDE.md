# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Safety

Claude Code runs here with `bypassPermissions` — `.env.local` holds the production Supabase service-role key, so a stray command can write to prod with no prompt. A `PreToolUse` hook (`.claude/hooks/agent-guard.sh`, registered in `.claude/settings.json`) blocks known prod-writing commands before they run: every writing `scripts/*.ts` (Supabase/BaseLinker/Sanity writes), `supabase db push`/`migration repair`, `psql`/raw SQL DDL-DML, `vercel env`, `git push --force`, and test runners (`playwright test`, `npm test`, `npm run test*`) unless `SUPABASE_TARGET=local` is set. Malformed hook input fails closed (blocked).

To deliberately run a blocked command against prod, start the session with `HA_ALLOW_PROD=1 claude` — the hook only trusts this from the session's own environment; setting it inline in a command is treated as a bypass attempt and stays blocked. Test the guard with `bash .claude/hooks/test-guard.sh`.

A session started in the parent `hydra_arms/` folder (outside this repo) is covered by a local, untracked `../.claude/settings.json` that points at this same hook.

`SUPABASE_TARGET=local` only unlocks the guard's test-runner check — it does not itself point tests at a local database (that lands in HA-1.05/HA-1.06). Until then, tests still hit prod: don't set it.

## Commands

```bash
npm run dev          # Start dev server (bumps max-http-header-size for Sanity)
npm run build        # Production build
npm run lint         # ESLint

# Scripts (all run with: npx tsx scripts/<name>.ts)
npx tsx scripts/baselinker-sync.ts    # Manual BL→Supabase product sync
npx tsx scripts/sanity-seed.ts        # Seed initial Sanity content
npx tsx scripts/check-db.ts           # Inspect Supabase DB state
npx tsx scripts/reset-shop-db.ts      # Wipe and re-seed shop tables
```

No test runner is configured.

## Architecture

### Route Groups & Layouts
- `src/app/(main)/` — all public-facing pages, wrapped by `src/app/(main)/layout.tsx`
  - The main layout wraps every page in: `CartProvider` → `LoadingScreen` → `SmoothScroll` → `GlobalCursor` → `Nav` → `{children}` → `Footer` → `CartTrigger`
  - Sanity `siteSettings` and `navigation` are fetched server-side here and passed down to Nav/Footer
- `src/app/studio/[[...tool]]/` — Sanity Studio (dynamic route, not inside `(main)`)
- `src/app/auth/callback/` — Supabase OAuth callback

### Server → Client Component Pattern
All content pages follow this pattern: server component fetches from Sanity (via `sanityFetch`), falls back gracefully to hardcoded defaults if Sanity isn't configured, then passes data as props to a `*Client.tsx` component:
- `page.tsx` (server, fetches) → `*PageClient.tsx` (client, renders with GSAP/Lenis)

### Sanity CMS
- Client: `src/sanity/client.ts` — `sanityFetch()` returns `null` when `NEXT_PUBLIC_SANITY_PROJECT_ID` is unset (graceful degradation)
- Queries: `src/sanity/queries.ts`
- Schemas: `src/sanity/schemas/` — includes siteSettings, navigation, homePage, service, oNasPage, uslugiPage, wspolpracaPage, certyfikatyPage, blogPost, newsPost, distributionChannel
- Image helper: `src/sanity/image.ts` (wraps `@sanity/image-url`)

### Shop System
**Data flow:** BaseLinker API → Supabase (`shop_products`, `shop_categories`) → Next.js API routes → React client

- **BaseLinker client**: `src/lib/baselinker/client.ts` — set `BASELINKER_MOCK=true` to use fixture data from `src/lib/baselinker/fixtures/` instead of live API. Inventory ID: 35743.
- **Sync**: `POST /api/shop/sync` (header: `x-sync-secret`, manual/VPS) or `GET` (Vercel cron, `Authorization: Bearer $CRON_SECRET`) or `npx tsx scripts/baselinker-sync.ts`. Runs nightly via Vercel cron (`vercel.json`); `/api/shop/orders/sync` (same auth scheme) every 4h. Sync never overwrites `product_type` or `source_warehouse`.
- **Cart**: Client-side `useReducer` in `src/components/shop/CartProvider.tsx`, persisted to `localStorage` as `hydra-cart`.
- **Checkout**: `POST /api/shop/checkout` — validates items/restrictions, then calls the `checkout_create_order` Postgres RPC (migration 006): stock decrement + order + items in one transaction. Pushes to BaseLinker after (non-fatal, `blockedRetries: 0`; orphans retried by `/api/shop/orders/sync`). Rate-limited per IP (`src/lib/rateLimit.ts`). **No payment gateway yet** — orders are created as `paid` (P24 planned, env vars templated).
- **Public product data**: always select `PUBLIC_PRODUCT_COLUMNS` (`src/lib/shop/fetchProducts.ts`) — never `select('*')` on `shop_products` in anything that reaches the client (hides `price_purchase`, `notes_internal`, connector fields).
- **Fulfillment routing**: `src/lib/shop/cartAnalysis.ts` — determines `direct_H1`, `direct_H2`, `consolidated`, or `pickup` based on `source_warehouse` and `product_type`.
- **`product_type` enum**: `standard | age_restricted | pickup_only` — non-standard items always force `pickup` route.

### Supabase
- Browser client: `src/lib/supabase/client.ts`
- SSR client (Server Components/Route Handlers): `src/lib/supabase/server.ts`
- Admin client (service role, bypasses RLS): `src/lib/supabase/admin.ts`
- Public client (no auth needed): `src/lib/supabase/public.ts`
- Types: `src/lib/supabase/types.ts` — manually maintained; each table requires `Relationships: []` to satisfy the `GenericTable` constraint
- Auth middleware: `src/middleware.ts` — redirects `/konto/*` to login if unauthenticated
- Migrations: `supabase/migrations/` — apply in order (001→006)

### Animation / UI Infrastructure
- GSAP + ScrollTrigger registered in `src/lib/gsap.ts` — import from here, not directly from `gsap`
- Lenis smooth scroll in `src/components/SmoothScroll.tsx`
- Custom cursor in `src/components/GlobalCursor.tsx`
- Reusable animation components: `AnimateIn`, `SplitText`, `ScrollRevealText`, `DrawReveal`, `DrawSVG`
- Fonts: Outfit (sans) and JetBrains Mono (mono), loaded via `next/font/google`

### Environment Variables
See `.env.local.example`. Key vars:
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — required for live CMS content
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for shop
- `SUPABASE_SERVICE_ROLE_KEY` — required for sync/checkout (admin operations)
- `BASELINKER_TOKEN` — required for live BL sync; `BASELINKER_MOCK=true` skips it
- `SYNC_SECRET` — protects manual `POST` sync triggers (`x-sync-secret` header)
- `CRON_SECRET` — Vercel sends it as `Authorization: Bearer` on cron `GET` invocations of the sync routes
- `XML_SYNC_ENABLED` — legacy XML→Supabase import (`POST /api/xml/sync`); keep `false`, BL is the source of truth
