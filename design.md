# FitPlus — design.md
Version 2.0 | Stage 2A: Premium Liquid Glass Experience

## 1. Design Intent
FitPlus is an original, India-first personal fitness coaching platform and independent trainer studio. Stage 2A elevates the Stage 1 foundation into a refined consumer health and coaching interface inspired by modern mobile health apps, tactile activity rings, restrained Liquid Glass chrome, and sports editorial photography — while keeping FitPlus's original identity free of proprietary trademarks or icon clichés.

## 2. Color System
| Token | Hex / Value | Role |
|---|---|---|
| `--fp-canvas` | `#101218` | Primary application background |
| `--fp-deep` | `#090B10` | Deep inset wells, shadow bases, hero gradients |
| `--fp-surface` | `#1C2029` | Readable content cards and list containers |
| `--fp-surface-elevated` | `#252A35` | Raised panels, sheets, interactive row hover surfaces |
| `--fp-accent` | `#FF803E` | Primary CTA, active tab, workout/streak highlight |
| `--fp-text-primary` | `#F5F5F7` | Primary headings, labels, metric numerals |
| `--fp-text-secondary` | `#A2A8B5` | Secondary descriptions, metadata, axis labels |
| `--fp-success` | `#B8E66C` | Completed targets, adherence gains |
| `--fp-hydration` | `#70C8ED` | Hydration tracking, water intake indicators |
| `--fp-recovery` | `#C1ACF9` | Recovery days, rest & sleep readiness |
| `--fp-error` | `#FF6B70` | Validation & error states |

Ambient depth is achieved with subtle radial lighting blending charcoal (`#101218`), slate (`#1C2029`), and muted ember (`rgba(255, 128, 62, 0.08)`). Neon borders and pure flat black backgrounds are avoided.

## 3. Liquid Glass Rules & Fallbacks
- **Where glass applies**: Navigation (`GlassNavigation`, `GlassTabBar`), floating controls (`GlassButton`, `GlassSegmentedControl`, `GlassSearchBar`, `FloatingActionButton`, `GlassTooltip`), and overlays (`GlassSheet`, `GlassModal`).
- **Where opaque surfaces apply**: Content cards (`MetricCard`, workout checklists, client tables, meal plans) use readable `#1C2029` / `#252A35` backgrounds with crisp 1px subtle translucent borders (`rgba(255, 255, 255, 0.08)`).
- **Fallback**: `@supports not (backdrop-filter: blur(1px))` renders high-opacity solid slate containers (`rgba(22, 25, 34, 0.97)` / `rgba(28, 32, 41, 0.98)`) so legibility holds across all browsers.

## 4. Typography
- Font family: `Manrope` with `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Noto Sans Devanagari", sans-serif` fallback.
- Scale:
  - Display headings: `36–48px` (`font-semibold`, `tracking-[-0.03em]`)
  - Screen headings: `28–34px` (`font-semibold`, `tracking-[-0.025em]`)
  - Section headings: `20–24px` (`font-semibold`, `tracking-[-0.015em]`)
  - Body text: `15–17px`
  - Captions & table metadata: `12–14px`
- All metrics, prices (`INR`), streaks, and timestamps enforce `font-variant-numeric: tabular-nums`.

## 5. Reusable Liquid Glass & Fitness Components
- `GlassNavigation`: Compact translucent sticky header + desktop rail with ambient blur and specular top edge.
- `GlassTabBar`: Floating mobile bottom tab bar (`Today`, `Plan`, `Progress`, `Coach`, `Profile`) with shared-layout spring pill indicator and 44px+ hit targets.
- `GlassButton`: Primary (`#FF803E` with dark `#101218` label), glass secondary, ghost tertiary, and destructive variants with Motion spring tap feedback.
- `GlassSheet` & `GlassModal`: Accessible dialogs with `AnimatePresence` spring transitions, backdrop blur, drag handle, Escape close, and focus return.
- `GlassSegmentedControl`: Shared-layout animated segmented switcher (`layoutId` spring highlight).
- `GlassSearchBar`: Translucent search bar with instant clear trigger.
- `GlassTooltip`: Accessible floating info popover.
- `FloatingActionButton`: Ember-orange floating `+` trigger with ambient glow and safe-area positioning.
- `MetricCard`: Opaque `#1C2029` card with animated numeric counter (`tabular-nums`), semantic accent, and optional micro sparkline/ring.
- `ActivityRing`: Multi-ring or single-ring animated SVG gauge supporting Workout (`#FF803E`), Hydration (`#70C8ED`), Recovery (`#C1ACF9`), and Completion (`#B8E66C`).
- `StreakIndicator` & `StreakIntroModal`: Header streak counter pill + Snapchat-inspired daily animated flame entrance modal (only reveals on active streak `> 0` once per day, never increments on app open).

## 6. Motion & Accessibility
- Primary motion engine: `motion/react` (`MotionConfig reducedMotion="user"`).
- Spring curves: crisp damped springs (`stiffness: 380, damping: 32`) for controls and sheets; smooth 600ms easing for SVG progress rings and counters.
- `prefers-reduced-motion: reduce` suppresses decorative movement while preserving instant state clarity.
- Every interactive target meets `>= 44×44px` hitbox sizing, keyboard focus visibility, and WCAG AA foreground contrast.
