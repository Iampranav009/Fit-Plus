# FitPlus — Stage 1 Build Status

**Status:** Stage 1 Foundation Complete (Checkpoints 1A, 1B, 1C)  
**Brand:** FitPlus (Provisional brand)  
**Locale:** `en-IN` · INR (`₹`) · `kg`/`cm` · `Asia/Kolkata` default (configurable)

---

## Companion Source-of-Truth Preserved
- `/public/assets/aistudio/design__1__5bd30202.md`
- `/public/assets/aistudio/text-pack_bf6f0dd9.md`
- `/public/assets/aistudio/asset-prompts_b246616a.md`

---

## Implemented Routes & Journeys

### Public & Onboarding
- `/` — Product-first landing page with quick previews for Client (`Aarav Mehta`) and Trainer Studio (`Arjun Kulkarni`)
- `/welcome` — Editorial full-bleed welcome hero + Get started / Sign in
- `/auth` — Explicitly simulated Google/Email demo controls + quick role previews
- `/join/:token` — Invite validator (`FIT-ARJUN-2026`, `FIT-MEERA-2026` valid; `FIT-EXP-000` expired; `FIT-USED-101` redeemed; unknown tokens handled)
- `/discover` — Filterable demo coach directory (search, specialty, mode, language, max INR price)
- `/trainers/:slug` — Public coach storefront (`arjun-kulkarni`, `meera-subramanian`, `kabir-kapoor`), demo packages (`₹499`, `₹999`, `₹1,999`/mo), mock checkout, consultation booking, WhatsApp demo sheet
- `/onboarding/role` — Client / Coach role choice preserving invite token
- `/onboarding/client/:step` — 6-step client wizard (`basics`, `measurements` optional/skip, `goal`, `training`, `food`, `review` + post-setup coaching choice)
- `/onboarding/trainer/:step` — 5-step trainer wizard (`profile`, `specialties`, `storefront`, `package`, `review`)

### Client App (`/app/*`, 5-tab mobile nav + desktop left rail)
- `/app/home` — Today view with greeting, sticky flame streak trigger & sheet, single-arc ProgressRing hero, 3–5 commitments, once-per-day streak celebration, 7-day consistency strip, recovery messaging, coach card, next consultation
- `/app/tasks/:id` — Commitment detail with coach instructions, override notes, value/session logging, notes, and completion/undo
- `/app/plan` — Workout / Nutrition / Habits segmented tabs, 7-day selector, Indian meal guidance & substitutions, empty plan state (`Kavya Sharma` fixture)
- `/app/progress` — Weight & Strength `TrendChart` (`7d` / `30d` / `12w`), 12-week `Heatmap` with day inspector & text list mode, validated measurement modal, private journal Stage 1 placeholder
- `/app/coach` — Active relationship details, demo disconnect confirmation, WhatsApp confirmation sheet, or no-coach discovery + invite code entry
- `/app/consultations` — Book, reschedule, cancel demo consultations with timezone display and duplicate-slot conflict prevention
- `/app/profile`, `/app/settings`, `/app/notifications` — Profile edits, timezone selector, demo persona switcher, simulated loading/error QA toggles, demo reset

### Trainer Studio (`/studio/*`, mobile bottom nav + 244px desktop rail)
- `/studio/overview` — Fixture-derived KPIs (active clients, 7d adherence, upcoming consults, demo package value) & priority attention list
- `/studio/clients` — Role-scoped linked client list (7 clients), search, goal group filters, multi-select, invite generator/revoker
- `/studio/clients/:id` — Client drill-down guarded to linked clients only, adherence/streak, assignments with override markers, weight trend, editable coach notes
- `/studio/assign` — Bulk & individual assignment builder from template or custom task, goal-group quick select, recurrence, duplicate skip, bulk confirm writing individual `Assignment` records
- `/studio/templates` — Create, edit, duplicate, archive task templates
- `/studio/ai-builder` — Deterministic sample plan drafter with `"Preview only — no live Gemini call"` notice, inline edits, explicit trainer approval & save to Templates
- `/studio/packages`, `/studio/consultations`, `/studio/storefront`, `/studio/settings`, `/studio/notifications`

---

## Asset Manifest (Generated Locally + Vector Fallbacks)

All 13 P0 and P1 editorial raster assets were generated once locally in `/src/assets/images/` via `generate_image` (JPEG format, bundled via Vite ES imports in `src/lib/assets.ts` with SVG/CSS fallbacks in `MediaImage.tsx`):

| Logical Asset | File | Aspect | Size | Role |
|---|---|---|---|---|
| `welcomeHero` | `welcome_hero_1794798688353.jpg` | 3:4 | ~673 KB | Welcome & Landing editorial hero |
| `todayHero` | `today_hero_1794798688453.jpg` | 3:2 | ~575 KB | Today progress hero background |
| `coachArjun` | `coach_arjun_1794798688146.jpg` | 1:1 | ~592 KB | Arjun Kulkarni portrait |
| `coachMeera` | `coach_meera_1794798688607.jpg` | 1:1 | ~641 KB | Meera Subramanian portrait |
| `coachKabir` | `coach_kabir_1794798689550.jpg` | 1:1 | ~639 KB | Kabir Kapoor portrait |
| `coachCover` | `coach_cover_1794798689071.jpg` | 16:9 | ~788 KB | Studio cover photo |
| `coachIntro` | `coach_intro_1794798689566.jpg` | 3:4 | ~654 KB | Role selection coaching visual |
| `goalStrength` | `goal_strength_1794798689675.jpg` | 1:1 | ~623 KB | Strength goal thumbnail |
| `goalBalance` | `goal_balance_1794798690693.jpg` | 1:1 | ~608 KB | General fitness goal thumbnail |
| `goalNutrition` | `goal_nutrition_1794798690791.jpg` | 1:1 | ~894 KB | Weight management / nutrition thumbnail |
| `foodBreakfast` | `food_breakfast_1794798690265.jpg` | 4:3 | ~803 KB | Poha breakfast meal card |
| `foodLunch` | `food_lunch_1794798690865.jpg` | 4:3 | ~816 KB | Roti-dal-sabzi thali lunch card |
| `consultation` | `consultation_1794798691226.jpg` | 4:3 | ~707 KB | Client consultation banner |

Vector SVG assets implemented in code: `BrandMark`, `ProgressRing`, `StreakFlame`, `EmptyState` (`plan`, `coach`, `progress`, `achievement`, `clients`), `Heatmap`, `TrendChart`.  
Optional 3D `.glb` asset: omitted in Stage 1 per brief ("No 3D asset is required to pass Stage 1") to preserve bundle lightness and mobile responsiveness.

---

## Tests & Verification
- Unit tests (`npm test` / `npx tsx --test src/tests/domain.test.ts`): **4/4 passed**
  1. Streak engine: recovery days, neutral unscheduled/future days, pending today, undo recalculation
  2. Bulk assignment engine: individual assignment creation, duplicate skipping, override preservation
  3. Invite validation (`valid`, `expired`, `not_found`), explicit demo enrollment, duplicate consultation slot conflict blocking
  4. Deterministic AI Plan Builder draft output
- TypeScript check (`npm run lint`) & production Vite build (`npm run build`): verified clean.

---

## Known Stage 1 Limitations (Deferred to Stage 2 / 3)
- Local browser `localStorage` persistence (`fitplus_demo_store_v1`) only — no backend database, real authentication, or server-side authorization.
- `DemoRoleGuard` is a client-side demo view guard only (explicitly commented in `src/App.tsx`).
- No live Gemini API calls (AI Plan Builder generates deterministic sample drafts).
- No live payment gateway or real INR billing; no automated WhatsApp messaging; photo journal is a non-uploading placeholder.
- Generated raster assets are JPEG files (575–894 KB); converting to compressed WebP/AVIF is recommended during Stage 2 CDN optimization.

---

## Stage 1 Acceptance Checklist
- [x] Mobile-first responsive web app + trainer desktop rail (`360px`–`1440px`, no horizontal overflow)
- [x] Design tokens (`#09090B`, `#17171B`, `#212126`, `#FF7829`, `#111113` on-accent) and tabular numerals applied
- [x] `en-IN` copy centralized in `src/data/copy.ts`; zero body-shaming or medical claims
- [x] All public, onboarding, client, and trainer routes wired with zero dead ends
- [x] Event-derived streak engine (recovery counts, neutral unscheduled/future days, undo recalculation, once-per-day celebration)
- [x] Role-scoped trainer client list & detail guard
- [x] Bulk assignment writing individual client tasks visible in client Today view
- [x] Demo-labeled auth, checkout, WhatsApp confirmation sheet, AI builder preview, and full demo reset
