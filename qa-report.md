# FitPlus Production QA Report

**Date:** 2026-11-19
**Branch:** claude/production-qa-abcc1b (based on main @ 0a592d7)
**Live site:** https://fitplus-kappa.vercel.app/

---

## Build

| Check | Result | Details |
|-------|--------|---------|
| `npm run lint` (tsc --noEmit) | PASS | Zero TypeScript errors |
| `npm run build` (vite build) | PASS | 2302 modules, built in 1.49s |
| Source maps | ABSENT | No `.map` files in `dist/assets/`, no `build.sourcemap` in vite config |
| `npm test` | 130/132 PASS | 2 failures (see below) |

### Test Failures (pre-existing, not regressions)

1. **T1-AUTH-04** — Role resolution returns `'client'` instead of expected `'trainer'`. Mock data issue in test fixture — the `verifyAuthenticatedRequest` stub returns a client role for Trainer A.
2. **firestore.rules hardening** — Test expects a catch-all deny rule (`match /{document=**} { allow read, write: if false; }`) that isn't in the current `firestore.rules` file. Configuration gap, not a code bug.

---

## Bundle Sizes

| Chunk | Size (KB) | Gzip (KB) | Status |
|-------|----------|-----------|--------|
| firebase-B6i3TIfD.js | 594.12 | 179.17 | OVER 500KB |
| index-Dq0X34al.js | 511.40 | 133.53 | OVER 500KB |
| react-BT0UhMaY.js | 249.55 | 79.23 | OVER 200KB |
| motion-qttE1xGd.js | 142.74 | 46.97 | OK |
| AppShell-B7qeMdA4.js | 41.81 | 12.29 | OK |
| TodayPage-DrY5U0W5.js | 41.52 | 11.45 | OK |
| LandingPage-BDNwwZ6R.js | 27.54 | 8.60 | OK |
| ExerciseLibraryPage-sdGYDVyJ.js | 27.75 | 6.46 | OK |
| All other page chunks | <25 | <7 | OK |

**Vendor splitting:** `manualChunks` correctly splits react, firebase, and motion into separate vendor chunks. The `index` chunk (511KB) is the app's shared code — this is the main candidate for further splitting.

**PWA precache:** 139 entries, 6049KB total. Large but acceptable for an offline-capable fitness app.

---

## Page Checks

| Route | Loads | Title | Console Errors | Notes |
|-------|-------|-------|----------------|-------|
| `/` | OK | "FitPlus — Every day. A better you." | None | Hero, tracks, client/trainer sections, footer all render |
| `/welcome` | OK | Correct | None | Hero image, "Every day. A better you." tagline |
| `/discover` | OK | Correct | None | "No published coaches yet" (expected — no demo data). Search bar present |
| `/trainers/invalid-slug` | OK | Correct | None | Shows "Trainer profile not found" with link to discover |
| `/auth` | OK | Correct | None | Google sign-in, email/password form, sign-in/create tabs |
| `/privacy` | OK | Correct | None | Real DPDP content, tabbed navigation to terms/refund/disclaimer |
| `/nonexistent-page` | OK | Correct | None | Branded 404 with links to home/discover/sign-in |
| `/app/today` | 404 | — | None | Shows 404 instead of redirecting to /auth (see warnings) |

**Not checked:** `/demo` redirect (would enter authenticated workspace), `/terms` `/refund-policy` `/disclaimer` (share the same LegalPage component with tab navigation from `/privacy` — confirmed tabs visible)

---

## Accessibility

| Check | Result |
|-------|--------|
| Heading hierarchy | PASS — H1 → H2 → H3, logical order on homepage |
| Text contrast (#A2A8B5 on #101218) | PASS — 7.85:1 ratio, exceeds WCAG AA (4.5:1) |
| Favicon | PASS — SVG icon at `/icon.svg` |
| Images with alt text | WARNING — 3 decorative 3D illustrations missing alt text (kettlebell, dumbbell, hydration bottle). Should have `alt=""` for screen readers |
| Focus indicators | Not fully tested (requires keyboard navigation in live browser) |
| Mobile menu | Not tested (desktop viewport only) |

---

## SEO / HTTP

| Check | Result | Details |
|-------|--------|---------|
| `robots.txt` | SERVED | Allows `/`, disallows `/app/`, `/studio/`, `/onboarding/`, `/admin` |
| `sitemap.xml` | SERVED | 4 URLs: `/`, `/discover`, `/welcome`, `/auth` |
| Favicon | PRESENT | SVG icon renders in browser tab |
| `/app/` auth guard | PARTIAL | Shows 404, not redirect to `/auth` |

**Sitemap gap:** Legal pages (`/privacy`, `/terms`, `/refund-policy`, `/disclaimer`) are not in `sitemap.xml`. The SEO session may be handling this.

---

## Issues Found

### Blockers

None. The app builds, deploys, and all public routes render correctly.

### Warnings

1. **[WARNING] Firebase chunk 594KB** — The `firebase` vendor chunk exceeds 500KB (594KB raw, 179KB gzipped). Consider importing only the Firebase modules used (Auth, Firestore) instead of the full SDK, or lazy-loading Firebase on first auth interaction.

2. **[WARNING] Index chunk 511KB** — The shared app code chunk is 511KB. This ships to every page load. Consider code-splitting heavy app-only code (coaching builders, workout engine, nutrition diary) behind route-level dynamic imports so the public marketing pages load lighter.

3. **[WARNING] React chunk 249KB** — React 19 + React DOM at 249KB is expected but above the 200KB target. Not actionable without switching frameworks — this is the baseline cost.

4. **[WARNING] `/app/` paths show 404 instead of auth redirect** — Unauthenticated users hitting `/app/today` see the 404 page instead of being redirected to `/auth`. No content leaks, but the UX should guide them to sign in. The route guard likely only runs inside the authenticated shell which the SPA router doesn't match for unauthenticated users.

5. **[WARNING] 3 images missing alt text** — Decorative 3D illustrations (kettlebell, dumbbell, hydration bottle) on the homepage lack `alt` attributes. Should have `alt=""` to be ignored by screen readers, or descriptive alt text.

6. **[WARNING] Sitemap missing legal pages** — `/privacy`, `/terms`, `/refund-policy`, `/disclaimer` not listed in `sitemap.xml`.

7. **[WARNING] Auth page has no demo buttons** — The task spec mentions "Demo buttons visible and labeled" on `/auth`, but none are shown. The interactive demo is accessible from the top nav ("Interactive demo" link). This may be intentional after the redesign.

8. **[WARNING] 2 test failures (pre-existing)** — T1-AUTH-04 role resolution mock returns wrong role; firestore.rules missing catch-all deny. Neither blocks deployment but both should be fixed.

---

## Recommendations

1. **Bundle size:** Lazy-import Firebase modules and split the index chunk to get public pages under 200KB initial JS. The marketing/public routes should not need the full coaching engine.
2. **Auth redirect:** Add a catch-all route guard that redirects `/app/*` to `/auth?redirect=...` for unauthenticated users.
3. **Accessibility:** Add `alt=""` to decorative images; test keyboard navigation and mobile menu.
4. **Sitemap:** Add legal page URLs.
5. **Test fixtures:** Fix the Trainer A role mock and add the firestore deny-all rule.
