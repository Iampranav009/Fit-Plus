# FitPlus — design.md
Version 1.0 | Stage 1 source of truth | Original Apple-inspired design

## Design intent
FitPlus is a calm, premium fitness companion and a professional coach workspace. It should feel engineered rather than decorated: confident typography, restrained accent, meaningful motion, clear hierarchy and tactility. Apple Health and fitness experiences are inspiration for craft, not a template to reproduce. Use no Apple logos, SF Symbols assets or proprietary SF fonts. Preserve original brand identity; name is provisional.

## Brand and semantic tokens
Wordmark: lowercase `fit` plus a custom orange `+`, simple, not an imitation of Apple Fitness+. Tagline: Every day. A better you. Voice: clear, supportive, action-oriented, no body shaming, no manufactured urgency.

| Token | Hex/value | Usage |
|---|---|---|
| canvas | #09090B | primary background |
| surface | #17171B | standard cards |
| surface-raised | #212126 | sheets, popovers |
| border | #34343B | visible separators / controls |
| text-primary | #F5F5F7 | primary text |
| text-secondary | #B2B2BA | secondary copy |
| text-muted | #92929B | tertiary metadata |
| accent | #FF7829 | main CTA, active control |
| accent-pressed | #E86219 | pressed state |
| accent-soft | #322116 | accent surface |
| on-accent | #111113 | text on orange |
| success | #34C759 | completed |
| warning | #FFC453 | caution |
| error | #FF6B70 | error text |
| focus | #FFB06B | keyboard focus ring |
| chart-grid | #303037 | chart grid |

Accent is rarely more than 10–15% of a normal screen. Use dark text on orange CTA; do not default to white on orange. Maintain WCAG AA contrast; verify actual pairs and states. No color-only meanings. Avoid neon gradients; optional warm localized light on one hero only. Dark is default; design tokens support later light theme, not required Stage 1.

## Typography
Use `Inter Variable` locally if a licensed font is available, otherwise system stack `-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`; no remote font dependency. Use tabular numbers for metrics, -0.03em tracking for large headings, normal for body. Support Devanagari fallback via device fonts. Do not use overly condensed bodybuilding typography.
| Role | Size/line height | Weight |
|---|---|---|
| display | 44/49 (mobile 36/41) | 650–700 |
| large metric | 42/46 | 650 |
| screen title | 30/36 | 650 |
| section title | 21/27 | 600 |
| card title | 17/23 | 600 |
| body | 15–16/23 | 400–500 |
| label | 13/18 | 500–600 |
| caption | 12/17 | 400–500 |
Avoid tiny all-caps paragraphs; labels can use restrained tracking. Don't truncate critical content.

## Layout and surfaces
4px grid; spaces 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Mobile content padding 20px (16 at 360px), section gap 24–32px. Client top bar 56–64px, bottom nav 64–72px + safe area. Radius 12 for controls, 18 for cards, 26 for hero/sheets, pill for chips. Use solid surfaces and 1px border; one soft shadow for overlays only. Glass: nav/sheet can use backdrop blur with opaque fallback; never blur body text. Buttons min 48px height, hit areas >=44px, form labels above fields. Desktop trainer workspace: 232–256px rail, 32px margins, main content max 1440px, grid only where content benefits. Breakpoints 640 / 768 / 1024 / 1280. Use portrait image crop with explicit aspect ratio. Keep primary CTA within thumb reach without blocking content.

## Component contracts
- AppShell: role-aware nav, sticky header, safe areas, keyboard access; mobile tabs with icon + label.
- PrimaryButton: solid accent, dark label, optional spinner, disabled state, pressed feedback. Secondary: neutral filled. Tertiary: text. Destructive actions require confirmation and visible text.
- Sheet/Dialog: 26px top radius mobile, accessible title/description, focus trap/return, escape close, content scroll; desktop modal.
- TaskRow: icon, title, category/time, optional target, checkbox/log CTA; completed check + muted style, remains readable. Detail route for instructions. Never make the entire card and checkbox competing nested buttons.
- ProgressRing: numeric label central, accessible value, one orange arc, neutral track; clamp to 0–100. Secondary KPI cards can be plain text without decoration.
- StreakFlame: custom SVG, animation only on milestone; current streak in Today header, tap opens details. Rest day badge distinct from missed. Calendar heatmap neutral-to-orange with legend, key navigation or accessible list alternative. Do not use Apple Activity's exact three-ring color scheme.
- CoachCard: portrait, name, speciality, online/offline, clear action. No false credentials. Packages: price/cadence and benefits; no fake “sale” labels.
- InputField: persistent label, helper/error, appropriate unit and input mode; no real data requested in demo. StepIndicator: current/total, back, optional skip, review.
- ConsultSlot: available/selected/booked state with text and button semantics. Charts expose values, axes and units; mobile readable without hover.
- EmptyState: one relevant icon/SVG, heading, short copy, clear action. Skeleton respects reduced motion. Toast announces success via aria-live; critical errors inline.

## Key screen art direction
Welcome: full-bleed or inset cinematic gym image with bottom scrim, wordmark above, text outside artwork, headline and single obvious CTA; secondary sign-in. Onboarding: one question group per screen, large type, subtle compact visual depending on step, progress top, CTA pinned within safe area, no illustrations competing with form.
Today: header greeting/date and flame; one 200–240px hero combining textual completion and ring, optional small athlete crop; compact task list; weekly activity and coach card, not a wall of KPI tiles. Plan: editorial title, segmented tabs, week/day selector, exercise or meal rows. Progress: primary metric and period toggle, line chart, heatmap, recent logs. Coach: no-coach empty state or active relationship plus discovery entry; discovery filters above profile list. Public coach detail: 16:9 photo, overlapping avatar only if contrast stays high, clear package and consultation actions. Studio: restrained desktop workspace with left rail, main overview, one prominent quick action, charts and actionable lists; mobile uses stacked cards and compact list. AI Builder: calm step form, draft panel, approval status, never a consumer chatbot with an unsafe authority claim.

## Motion rules
| Interaction | Duration | Behavior |
|---|---|---|
| Press | 90–120ms | scale 0.98, restore, no bounce |
| Toggle/check | 140–180ms | tick reveal and subtle color transition |
| Tab state | 160–220ms | crossfade / underline |
| Route entry | 220–280ms | opacity + 6–10px translation |
| Sheet | 260–340ms | smooth slide / opacity |
| Ring update | 500–650ms | interpolate value, no overshoot |
| Streak celebration | 700–1100ms once | small flame glow and short text |
Use easing cubic-bezier(.2,.8,.2,1), or tuned critically damped spring only where needed. Animate transforms/opacity rather than layout; no continuous animated wallpaper, parallax scroll hijacking, confetti loops or blocking intro. `prefers-reduced-motion` removes translation, celebration and 3D rotation; keep instant state communication. No haptics claim on web; optional platform-native haptics later.

## Assets and performance
Use local licensed/generated WebP or AVIF, plus SVG for vector artwork. Design-generated photo subjects are fictional, diverse adult Indian fitness clients/coaches; no before/after claims. Never use images as text or fake instructional exercise demonstrations. Artwork is decorative unless semantically useful; decorative alt empty. Reserve image dimensions, lazy load below fold, first hero prioritized. Targets: hero <=350 KB, cards <=150 KB, SVG <=20 KB where practical, optional GLB <=500 KB; no dependency on 3D. Prefer custom inline SVG/CSS illustration over generating heavy assets if appropriate. Verify at widths 360/390/430/768/1024/1440; font size, safe area, contrast, touch targets, keyboard and reduced motion. No production tracking or external calls in demo.
