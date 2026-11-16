# FitPlus — image and motion asset brief
Generate these assets once during the build using the available image generation tool (enable the image-generation capability if required). Do not fabricate image files or external URLs. If generation is unavailable, implement designed local SVG or CSS fallbacks and list unmet assets in BUILD_STATUS.md. No runtime image calls. This document is an asset-generation brief, not a collection of finished images.

## Universal visual direction
Premium original fitness editorial photography, dark charcoal studio, natural skin texture, clean sportswear in charcoal/black, subtle warm orange lighting, realistic anatomy, adult Indian subjects with varied body types and genders, respectful athletic presentation, no stereotypes, no body transformation promises. Avoid extreme muscularity as the only ideal. No text, lettering, brands, logos, watermarks, UI screenshots or copyrighted characters. Keep art and interface copy separate. Produce WebP/AVIF after generation if possible; preserve source licensing/provenance notes. Use SVG/CSS for vectors. Do not invent exercise technique illustrations as authoritative instruction.

| ID / destination | Ratio | Image-generation instruction |
|---|---|---|
| welcome-hero.webp | 4:5 | Editorial waist-up portrait of an adult Indian woman athlete in charcoal performance wear, taking a calm breath after training, eyes forward, dark cinematic gym, soft amber rim light, subject on right and middle, bottom third negative space for overlay, realistic premium lifestyle campaign. |
| coach-intro.webp | 4:5 | Adult Indian personal trainer guiding another adult through a simple conversation in a clean modern gym; friendly, attentive, natural candid photography, black surfaces, soft orange practical light, composition with empty lower third. |
| today-hero.webp | 3:2 | Minimal still life of matte black kettlebell and clean towel on textured dark gym bench, warm edge light, objects right aligned, left half subdued empty space, luxury product photography. |
| goal-strength.webp | 1:1 | Matte graphite dumbbell pair, sculptural product shot, slightly elevated three-quarter perspective, subtle amber edge light, dark seamless studio. |
| goal-balance.webp | 1:1 | Rolled yoga mat and graphite training shoes, premium dark product photo, warm accent, understated and compact. |
| goal-nutrition.webp | 1:1 | Balanced Indian meal with dal, roti, vegetables and curd, simple dark ceramic bowl arrangement, overhead editorial food photography, realistic portions, no nutrition labels. |
| food-breakfast.webp | 4:3 | Poha with peas, lemon and herbs served in dark ceramic, warm natural light, realistic Indian home breakfast, not stylised beyond recognition. |
| food-lunch.webp | 4:3 | Roti, dal and sabzi on a simple thali, warm charcoal tabletop, appetising but realistic Indian lunch. |
| coach-arjun.webp | 1:1 | Fictional adult Indian male personal trainer, 30s, approachable natural expression, simple black sports top, studio portrait, charcoal background, no credentials implied. |
| coach-meera.webp | 1:1 | Fictional adult Indian woman strength coach, 30s, relaxed confident expression, black sports top, charcoal studio, soft rim light. |
| coach-kabir.webp | 1:1 | Fictional adult Indian male general fitness coach, 40s, approachable, varied body type, charcoal sportswear, restrained studio portrait. |
| coach-cover.webp | 16:9 | Modern independent fitness studio, dark rubber floor, neatly arranged equipment, soft cinematic warm light, clean wide composition, no brand logos or people necessary. |
| consultation.webp | 4:3 | Fictional Indian fitness coach listening to an adult client at a consultation desk, notebook and water bottle, gym in soft background, respectful candid photo. |

## Art priority and placement
P0: welcome, today, 3 coach portraits, coach cover. P1: onboarding coach visual, goal thumbnails, two Indian meal images, consultation visual. P2: optional 3D. Use one strong primary art moment per screen, not repetitive backgrounds. On Today use hero right crop only if metrics remain legible. Trainer studio stays data-focused with small avatars only. Use CSS gradients only as a dark scrim when necessary. Do not reuse one portrait to represent different coaches.

## Original vector / animation assets (implement as code)
- `streak-flame.svg`: single organic orange flame with smaller pale orange core, no resemblance to a proprietary emoji; resting state static; 700–1100ms brief pulse after eligible completion.
- `progress-ring.svg` or React SVG: neutral track, animated orange arc, center value as real text, accessible description, not Apple Activity ring replica.
- `empty-plan.svg`: minimalist clipboard + dumbbell silhouette; `empty-coach.svg`: two abstract figures and connection; `empty-progress.svg`: rising dots along a line. Match stroke weight 1.7–2 at 24px scale, larger illustrations use optical adjustments.
- `achievement.svg`: custom geometric medal with plus detail; show only after an earned milestone.
- `heatmap.tsx`: original interactive grid, neutral no-task cell, orange scale, legend and keyboard-accessible details; no screenshot.

## Optional 3D brief
If the development environment provides licensed GLB/glTF assets or a genuine 3D generation tool, use one low-poly matte charcoal dumbbell or kettlebell with orange cap accents and soft studio shading. Prefer binary `.glb` (not `.ltf`; that is not the intended glTF extension). Target <500KB, compressed meshes/textures, no auto-running WebGL on mobile. Optional 3–5 degree pointer/scroll tilt only; paused offscreen and disabled on reduced motion. Provide a pre-rendered poster or SVG fallback. An image generator makes raster visuals, not editable 3D mesh files; do not rename a PNG as GLB. No 3D asset is required to pass Stage 1.

## QA
Validate every file exists, has correct content type, aspect ratio and accessible alt handling; check no baked text, no malformed anatomy, no inappropriate content, no visible brands and no remote hotlinks. List generated vs fallback assets with filenames, dimensions, provenance and approximate byte size in BUILD_STATUS.md.
