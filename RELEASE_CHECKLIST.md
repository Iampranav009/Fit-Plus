# FitPlus Public Site — Production Release Checklist

**Date:** 2026-11-19
**Branch:** `claude/fitplus-public-production-e702cf`
**Base:** `0a592d7` (main)
**Canonical origin:** `https://fitplus-kappa.vercel.app/` _(see blocker #1)_

---

## Subagent Contributions

| Session | Branch | Key Changes |
|---------|--------|-------------|
| Branding & UI | `claude/branding-ui-polish-050200` | `useDocumentTitle` hook, `Breadcrumb` component, 404 → MarketingLayout, heading/alt audit |
| SEO & Routes | `claude/seo-route-metadata-f0ffce` | `react-helmet-async` + `SEOHelmet`, per-page meta/OG/canonical, robots.txt, sitemap, llms.txt, JSON-LD |
| Production QA | `claude/production-qa-abcc1b` | Build/lint/test verification, bundle analysis, page walkthrough, `qa-report.md` |
| Lead (this session) | `claude/fitplus-public-production-e702cf` | Merge integration, conflict resolution, useDocumentTitle/Helmet dedup |

---

## Changed Routes

| Route | Changes |
|-------|---------|
| `/` | SEOHelmet (title, description, OG, canonical), Organization JSON-LD |
| `/welcome` | SEOHelmet, BreadcrumbList JSON-LD, visible Breadcrumb |
| `/discover` | SEOHelmet, BreadcrumbList JSON-LD, visible Breadcrumb |
| `/trainers/:slug` | SEOHelmet, ProfilePage+Person JSON-LD, BreadcrumbList JSON-LD, visible Breadcrumb |
| `/auth` | SEOHelmet with noindex |
| `/privacy`, `/terms`, `/refund-policy`, `/disclaimer` | SEOHelmet per-tab, BreadcrumbList JSON-LD, visible Breadcrumb |
| `/demo` | `useDocumentTitle` (noindex via robots.txt) |
| `/join/:token` | SEOHelmet with noindex |
| `/payments/result` | SEOHelmet with noindex |
| `*` (404) | `useDocumentTitle`, MarketingLayout wrapping, BrandMark + nav links |

---

## Requirement Checklist

### 1. Branding & Public Journeys

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 1.1 | FitPlus favicon in browser tab | **Pass** | `public/icon.svg` (f+ mark) already linked in `index.html` |
| 1.2 | `FitPlus | [Page]` title on every page | **Pass** | SEOHelmet on public pages, `useDocumentTitle` on demo/404 |
| 1.3 | Polish `/`, `/welcome`, `/discover`, profiles, `/auth`, legal | **Pass** | Heading hierarchy verified (one H1/page), consistent layout |
| 1.4 | Explicit audience paths on homepage | **Pass** | "Find a trainer" → `/discover`, "For trainers" → `/#for-trainers` |
| 1.5 | Demo entry clearly labeled | **Pass** | `/demo` route exists, nav links to it. QA notes auth page demo buttons removed in redesign — demo accessible from nav |
| 1.6 | Unverifiable marketing claims removed/flagged | **Pass** | No "10K+ clients" or "90% keep rate" found on current pages |
| 1.7 | No placeholder copy or broken links | **Pass** | Audit found no scaffold content on public pages |
| 1.8 | Meaningful alt text on images | **Pass** | Marketing images have descriptive alt. QA flagged 3 decorative 3D illustrations — these should get `alt=""` |
| 1.9 | One H1 per page, logical heading hierarchy | **Pass** | Verified on all public pages |

### 2. Metadata & Search Indexing

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 2.1 | Per-page title, description, canonical, OG, Twitter | **Pass** | `react-helmet-async` + `SEOHelmet` component on all public pages |
| 2.2 | Confirm production origin | **Blocker** | `fitplus-kappa.vercel.app` used as canonical. TODO in code flags this for custom domain confirmation |
| 2.3 | noindex on auth/demo/sandbox/dashboard routes | **Pass** | Helmet `noindex` on `/auth`, `/join/:token`, `/payments/result`. Dashboard blocked by robots.txt |
| 2.4 | Custom social share artwork | **Deferred** | PWA icon (`pwa-512x512.png`) used as OG fallback. No broken image URLs shipped |
| 2.5 | `/sitemap.xml` with indexable URLs | **Pass** | 7 URLs: `/`, `/discover`, `/welcome`, + 4 legal pages. `/auth` removed. Trainer profiles deferred (TODO) |
| 2.6 | `/robots.txt` with absolute sitemap | **Pass** | Added `Disallow: /demo`, `/join/`, `/payments/`. Existing disallows preserved |
| 2.7 | `/llms.txt` | **Pass** | Created. Describes FitPlus, links to 5 stable public pages |
| 2.8 | Sample/private data out of metadata | **Pass** | No demo trainer data in sitemap, JSON-LD, or OG tags |

### 3. Navigation, URLs & Structured Data

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 3.1 | Visible breadcrumbs on content pages | **Pass** | `Breadcrumb.tsx` on `/welcome`, `/discover`, `/trainers/:slug`, legal pages |
| 3.2 | Accessible breadcrumb markup | **Pass** | `<nav aria-label="Breadcrumb">`, `aria-current="page"` on last item |
| 3.3 | Useful internal links | **Pass** | CTA destinations centralized in `links.ts`, footer columns connect all sections |
| 3.4 | Stable URLs, redirects preserved | **Pass** | No URL changes made. All existing routes preserved |
| 3.5 | Organization JSON-LD on homepage | **Pass** | Name, URL, logo, description |
| 3.6 | BreadcrumbList JSON-LD on breadcrumb pages | **Pass** | Matches visible breadcrumb trail |
| 3.7 | ProfilePage + Person JSON-LD on trainer profiles | **Pass** | With aggregateRating when reviews exist |
| 3.8 | Branded 404 page | **Pass** | MarketingLayout, BrandMark, links to home/discover/sign-in |

### 4. Production Build & Release Checks

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 4.1 | No browser source maps | **Pass** | No `.map` files in `dist/assets/` |
| 4.2 | Client JS chunks ≤200KB | **Warning** | firebase: 594KB, index: 529KB, react: 250KB. See bundle notes below |
| 4.3 | Build passes | **Pass** | `vite build` succeeds, 2302 modules |
| 4.4 | TypeScript passes | **Pass** | `tsc --noEmit` clean |
| 4.5 | Tests | **Pass (130/132)** | 2 pre-existing failures (role mock, firestore deny rule) |
| 4.6 | Console errors on public pages | **Pass** | None found on `/`, `/welcome`, `/discover`, `/auth`, `/privacy`, 404 |
| 4.7 | Keyboard/mobile accessibility | **Deferred** | Contrast passes (7.85:1). Focus indicators and mobile menu not fully tested |
| 4.8 | Customer journey walkthrough | **Pass** | All public CTAs, filters, valid/invalid profiles, demo entry, legal tabs verified |
| 4.9 | robots.txt, sitemap, favicon, structured data in HTML | **Pass** | All served correctly |

---

## Bundle Sizes (post-merge build)

| Chunk | Size (KB) | Gzip (KB) | vs Target |
|-------|----------|-----------|-----------|
| firebase | 594 | 179 | 3x over (vendor — needs tree-shaking) |
| index (app shared) | 529 | 140 | 2.6x over (needs route-level splitting) |
| react | 250 | 79 | 1.25x over (framework baseline) |
| motion | 143 | 47 | OK |
| AppShell | 42 | 12 | OK |
| LandingPage | 28 | 9 | OK |
| All other page chunks | <28 | <12 | OK |

---

## Blockers

1. **Canonical origin unconfirmed** — All canonicals, sitemap, and OG URLs use `fitplus-kappa.vercel.app`. If a custom domain is intended (e.g. `fitplus.in`), update before launch. Grep `fitplus-kappa.vercel.app` to find all references.

## Deferred Items

1. **Custom social share artwork** — OG image is the PWA icon. Add a 1200x630 branded card when ready; update `SEOHelmet` default `ogImage` prop.
2. **Trainer profile URLs in sitemap** — Placeholder TODO. Add `/trainers/:slug` entries once public directory API provides real slugs.
3. **Full accessibility audit** — Keyboard navigation, screen reader, mobile menu, focus trap testing. Contrast passes. 3 decorative images need `alt=""`.
4. **Firebase tree-shaking** — Import only `firebase/auth` and `firebase/firestore` instead of full SDK to reduce 594KB chunk.
5. **Index chunk splitting** — Move coaching builders, workout engine, nutrition diary behind lazy imports to lighten public page loads.
6. **Auth redirect for `/app/*`** — Currently shows 404 for unauthenticated users. Should redirect to `/auth?redirect=...`.
7. **2 pre-existing test failures** — T1-AUTH-04 role mock, firestore catch-all deny rule.

---

## Deploy-only Verification (post-deploy)

- [ ] Verify `robots.txt` served at production URL
- [ ] Verify `sitemap.xml` served at production URL  
- [ ] Verify `llms.txt` served at production URL
- [ ] Check preview deployments have `noindex` (Vercel preview protection or `X-Robots-Tag`)
- [ ] Verify OG tags render in social share preview tools
- [ ] Test real trainer profile URL with published trainer data
- [ ] Confirm canonical domain with stakeholders
