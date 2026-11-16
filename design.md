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

---

## 7. Stage 4A UI & Interactive Experience Refinements

### Live Workout Experience (`LiveWorkoutPage`)
- **Top Control Bar**: Minimalist session header with back escape hatch, elapsed session stopwatch (`tabular-nums`), pause/resume toggle, and high-visibility Finish action.
- **Dynamic Rest Countdown Banner**: Highlighted ember-orange banner with countdown timer, ±15s fine-adjustment controls, skip trigger, and haptic pulse upon rest expiration.
- **Exercise Stepper Carousel**: Horizontal sticky strip with per-exercise completion badges (`#1`, `#2`, ...), progress counters (`2/3 sets`), and active selection indicators.
- **Anatomical Target Visualizer (`AnatomyMuscleSvg`)**: Vector SVG rendering anterior and posterior human muscular systems highlighting primary (`#FF803E`) and secondary (`#FFB06B`) target muscle groups with zero external image asset dependencies.
- **Live Set Tracking Grid**: Numeric inputs for weight (kg) and reps, instant one-rep max estimation (`Epley formula`), personal record detection, and tap-to-complete check buttons with light tactile haptic vibration.
- **Exercise Substitution Sheet**: In-line modal showing approved alternatives matching the current target muscle group and equipment availability.

### Indian Nutrition Diary (`NutritionDiaryPage`)
- **NIN / IFCT Nutritional Disclaimer Banner**: Persistent contextual banner clarifying that values are verified dietary estimates aligned with ICMR-NIN / IFCT standards for guidance rather than clinical prescriptions.
- **Meal Slot Buckets**: Dedicated cards for Breakfast, Lunch, Evening Snack, Dinner, and Additional Items with per-slot completion checkmarks.
- **Indian Food Catalog Picker**: Searchable modal featuring 23+ home staples with portion multipliers (0.5x, 1x, 1.5x, 2x) and instant macro calculations.
- **Quick-Add Custom Food Item**: Fallback form enabling members to log mom's recipes or uncataloged regional dishes.

### FitPlus Wrapped (`WrappedPage`)
- **Nocturnal Liquid-Glass Canvas Card Generator**: Native HTML5 Canvas rendering of monthly milestones (`workoutsCompleted`, `totalVolumeKg`, `consistencyPercent`, `longestStreakDays`, `topExercise`).
- **Aspect Ratio Selector**: One-click toggle between 9:16 (Instagram Story / WhatsApp Status, 1080×1920) and 4:5 (Instagram Feed, 1080×1350).
- **Privacy-First Architecture**: Optional weight changes, photos, and personal notes are **default OFF** with explicit opt-in toggles.

### Achievement Celebrations (`AchievementUnlockModal`)
- **Medallion Renderers**: 9 distinct custom SVG medallions representing milestones (First Workout, Personal Record, 7-Day Streak, 14-Day Streak, 30-Day Streak, 60-Day Streak, 100-Day Streak, 10 Active Days, 30 Active Days).
- **Celebration Modal**: Animated backdrop with spring entrance, contextual haptic feedback (`triggerHaptic('success')`), and clear dismissal controls.

---

## 8. Stage 4B Coaching Operations & Messaging UI

### FitPlus Connect (`MessagesPage`, `ChatConversationList`, `ChatMessageBubble`, `ChatComposer`)
- **Apple Messages Aesthetic**: Clean 2-column layout (conversation list + active message stream) with floating glass composer.
- **Message Bubbles**:
  - *Sent Messages*: Gradient fill (`from-brand-primary to-orange-500`) with dark `#101218` high-contrast typography, timestamp, and read-receipt double checkmarks.
  - *Received Messages*: Semi-translucent glass cards (`bg-glass border border-glass-border`) with light `#F5F5F7` text.
- **Plan Reference Cards**: Interactive mini-cards embedded inside bubbles displaying program title, day count, and a direct "View Routine" button.
- **Image Attachments**: Rounded thumbnail with subtle border and one-tap fullscreen zoom modal.
- **Composer Controls**: Auto-growing textarea, attachment icon, plan picker icon, and circular spring-animated send button with tactile haptic trigger.

### Workout Studio Builder (`StudioWorkoutBuilderPage`)
- **Multi-Week Program Tabs**: Minimalist glass tab bar allowing trainers to switch between Program Weeks (Week 1, Week 2, etc.) and Training Days (Push, Pull, Legs, Recovery).
- **Live Day Metrics Bar**: Sticky summary header calculating total sets, estimated completion duration (minutes), and primary target muscle breakdown in real time.
- **Exercise Card Design**: Individual exercise modules with drag-and-drop-ready layout, set/rep counter pills, rest duration dropdown, RPE selector, and coaching tip inputs.

### Nutrition Studio Builder (`StudioNutritionBuilderPage`)
- **Authentic Indian Meal Slots**: Structured cards for Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, and Post-Workout.
- **Live Macro Summary Header**: Multi-bar visual gauge displaying real-time Calories, Protein (g), Carbohydrates (g), and Fat (g) compared against daily target benchmarks.
- **Indian Portion Selectors**: Specialized unit dropdowns supporting standard Indian kitchen measurements (`katori`, `phulka`, `piece`, `cup`, `bowl`, `100g`) with instant recalculation.

### Client Pulse & Studio Action Center (`StudioOverviewPage`, `StudioClientsPage`)
- **Status Indicator Badges**:
  - `On Track`: Emerald green badge with pulse glow (`#B8E66C`).
  - `Needs Attention`: Crimson warning badge (`#FF6B70`) with high-priority sorting.
  - `Follow-up Recommended`: Amber badge (`#FFB06B`) for unreviewed check-ins.
  - `Insufficient Data`: Subtle slate badge (`#A2A8B5`) for newly onboarded clients.
- **Action Cards**: Elevated `#1C2029` cards featuring client avatar, urgency badge, contextual reason, and one-click quick CTAs (`Message`, `Review Check-In`, `WhatsApp`).

