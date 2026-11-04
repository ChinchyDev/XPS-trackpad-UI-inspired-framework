# Edge-Lit Framework: Road to v1.0 release

Design thesis (from XPS 14/16 2026): **flush surfaces + minimal edge indicators.**
The 2024 invisible trackpad failed because users couldn't find its edges, and the 2026 model added etched boundary lines. Rule: *a control may be unboxed, but never unlocatable.*

Legend: [ ] todo · [x] done · (D) needs your decision

## Phase 0: Decisions (unblock everything)
- [x] (D) Accent = **cyan** (`#22d3ee` dark / `#0e7490` light). Developer-overridable via `--accent`. Indigo is now the `info` signal.
- [x] (D) Radius policy approved (0 / 2 / 3 / 4, hard cap 4px).
- [~] (D) Overlay elevation: **experiment, don't decide yet.** Toolkit built (`data-lit`, `data-depth`, `data-scrim`) + `elevation-lab.html`. Needs the original OAuth example for reference.
- [x] (D) Radio = square with left bar.
- [x] (D) Typography: all-mono for now; revisit before release.
- [x] (D) Delivery: CSS first, then Web Components; React wrapper only where it earns its place.

## Phase 1: Foundations
- [x] Token set, dual theme, signal system (`monoedge.css`)
- [x] Contrast audit and fix
- [x] Introduce radius scale tokens (0 / 2 / 3 / 4) and apply per the policy
- [ ] Tokens as W3C DTCG JSON, built to CSS, Tailwind and JS with Style Dictionary (one source of truth)
- [ ] Colours in OKLCH so a new accent is derived, not hand-tuned, and auto-checked for 4.5:1 / 3:1
- [ ] CSS cascade layers (`@layer reset, tokens, base, components, utilities`) so users can override safely
- [ ] Logical properties everywhere (inline-start/end) for RTL
- [ ] Container queries for components (not just viewport media queries)
- [ ] Automated contrast test over every token pair, both themes, run in CI

## Phase 2: Edge-indicator system (the signature)
- [x] Generic edge-light layer: `.me-lit[data-lit="t r b l"]` (any subset) works on panels, menus, buttons
- [ ] Edge light fades toward its ends (like the trackpad etch lines); currently solid
- [ ] Light-mode scrim is muddy at 40%; tune to ~25-30%
- [~] Document the "edge vocabulary": ticks (fields), L-light (check), left bar (radio, row hover), top bar (tab, button, segment)
- [ ] "Locatability" rule: every interactive zone must show at least one edge cue at rest
- [ ] Haptic equivalent: `navigator.vibrate` and `:active` micro-travel (1px) for press feedback
- [ ] Palm-rejection analogue: guard against accidental activation of large flush zones (confirm on destructive actions)
- [ ] Add touch and pointer demos (a literal trackpad-style region, e.g. a 2D pad control)

## Phase 3: Components
- [x] First pass of ~35 components
- [ ] Combobox / autocomplete, date and time picker, file upload, command palette
- [ ] Tree view, multi-select, tag input, rating-free alternative
- [ ] Charts: hairline axes, light-bar series, sparkline
- [ ] Stepper / wizard, side nav, app shell, toolbar
- [ ] Form layout patterns and validation timing guidance
- [ ] Verify every ARIA pattern in a real browser (tabs, menu, dialog, switch, accordion, table sort)

## Phase 4: Icons (see guidance in chat / below)
- [ ] Grid and stroke spec
- [ ] 40-icon starter set (SVG sprite, `currentColor`)
- [ ] Lit-edge variant (one segment in `--sig`)
- [ ] Icon button sizing and hit-area rules

## Phase 5: Quality and standards
- [ ] WCAG 2.2 AA audit (1.4.3, 1.4.11, 1.4.1, 2.4.7, 2.4.11, 2.5.8, 3.3.1)
- [ ] Screen reader pass (NVDA + VoiceOver) on the gallery
- [ ] Keyboard-only pass; visual regression screenshots (Playwright) in dark, light, compact, roomy
- [ ] Cross-browser: Chrome, Firefox, Safari (fix `color-mix` fallback)
- [ ] Performance budget: CSS < 30 KB gzipped, no JS needed for core components
- [ ] Reduced-motion, forced-colors, high-contrast, print verified

## Phase 6: Release
- [ ] Name and logo
- [ ] Docs site (generated from the gallery, one page per component, do/don't examples)
- [ ] Real demo apps (dashboard, settings, data table) to find remaining gaps
- [ ] Package (npm), semver, changelog, licence
- [ ] Rewrite the spec document from the tokens (no hand-maintained duplicates)

---

## Radius policy (proposed)
Principle: corner radius is a *signal*, not decoration. Rounded corners read as friendly, touchable and safe. Sharp corners read as precise and structural, and they draw attention. Nested radii should follow `inner = outer − gap`.

| Token | Value | Use | Why |
|---|---|---|---|
| `--radius-none` | 0 | Dividers, grid cells, table cells, tabs, split panels, anything that touches a neighbour | Structure and "light as structure" |
| `--radius-micro` | 2px | Default for inputs, checkboxes, badges, kbd, menus | Keeps the identity; just enough to avoid pixel-sharp corners |
| `--radius-soft` | 3px | Buttons and primary actions, segmented controls | These are the things people press; a slightly softer corner invites touch |
| `--radius-float` | 4px | Floating layers: modals, menus, tooltips, toasts | Detached surfaces need to read as separate objects |
| circle | never | Exception only if you decide for radio (see Phase 0) | |

Hard cap: **4px**. Compare the usual 12–24px "card" look you're avoiding.

## Standards to adopt
- **WCAG 2.2 AA**: text 4.5:1, non-text and control boundaries 3:1, target size ≥ 24px (2.5.8), visible focus (2.4.7 / 2.4.11), no colour-only meaning (1.4.1).
- **WAI-ARIA Authoring Practices**: tabs, menu button, dialog, switch, accordion, grid and listbox patterns.
- **Touch targets**: 44×44 (Apple HIG, WCAG AAA 2.5.5), 48 (Material). Handled via `pointer: coarse`.
- **W3C Design Tokens (DTCG)** format and Style Dictionary for builds.
- **User preference queries**: `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`.
- **Watch, don't adopt yet**: APCA (WCAG 3 draft contrast model).

---

## Findings log (from building dashboard.html on the framework)
Decisions from elevation review (v2 lab):
- [x] Shadows dropped from overlays in both themes; separation = raised surface (`--color-overlay`) + frame + blur scrim
- [x] Full-length top accent lines removed everywhere (menus, tooltip, modal). Light is now short, fading bars
- [x] Edge light fades at both ends; `--lit-span`, `--lit-ax/ay`, `--lit-level` (rest .2 / hover .55 / active 1)
- [x] Fields: only L/R ticks light, fading at both ends; focus ring suppressed in favour of the ticks (forced-colors fallback kept)
- [x] `.me-list`: one panel, light shows the selection on touching dividers only
- [x] Split footer rebuilt from the original: 3 edges, fade away from divider, directional divider glow
- [x] `.me-nav` (tabs + trailing actions) wraps on narrow screens; table scroll-hint on overflow

Open gaps the dashboard exposed:
- [ ] Charts / sparklines (Telemetry tab is a placeholder)
- [ ] Tabs have no overflow hint when scrolled (third tab clipped on phones)
- [ ] Field ticks as the ONLY focus indicator: audit against WCAG 2.4.13 (focus appearance); consider a short bottom bar as a second cue
- [ ] Idle field boundary contrast with faded ticks: measure against 1.4.11 (3:1)
- [ ] No undo / neutral state for the split footer
- [ ] Illumination levels not yet wired to `:hover` on every lit control (only opt-in via `data-lit-hover`)
- [ ] Light-mode glow is the weakest part: etch effect needs its own design pass
- [ ] Rejected in review: shadow-only overlays, one-lit-top "generic" panels, stacked lit provider buttons

---

## Round 3 log (a11y audit, light pass, garden system)
- [x] AUDIT CORRECTION: earlier claim that `--stroke-control` passed 3:1 was WRONG in dark mode (measured 2.88:1). Fixed: dark .42 (4.1:1), light ticks .46 (3.5:1). Focused ticks 10.4:1 dark / 5.4:1 light. Focus tick is also 2px (non-colour cue).
- [x] Light-mode lighting: pressed-ink etch (1px white under bar) + ambient wash (`--wash`), replaces glow
- [x] Components added: `.me-side`, `.me-bars` (chart MVP), `.me-nav`, field inline action (`.me-affix` button)
- [x] Bugs found by building the garden app and fixed in the framework: grid painted empty cells grey; table scroll-hint bands; links inheriting error colour; `hidden` attribute defeated by component display; focus offset selectors
- [ ] Still open: line/area charts, date picker, combobox, command palette, tabs overflow hint, icons, light-mode review by you
- [ ] AAA focus-appearance (2.4.13) not met for fields (ticks only); decide whether to add a second cue
- [ ] Write Playwright + axe tests: this review was by eye plus a contrast script

---

## Round 4: DESIGN RULES (from your review of dashboard / gallery / garden / lab v2)
These are rules, not component notes. New components must pass them before they ship.

1. **Backgrounds are never extreme.** Dark canvas `#14171d` / panel `#1b1f27` / surface `#222731` / overlay `#2a303c`. Light canvas `#dadee3` / panel `#e9ecef` / surface `#f0f2f4` / overlay `#f4f6f7`. No pure black or white. (Contrast re-measured: muted/dim text, signal text and strokes still pass; light signal text colours were darkened to compensate.)
2. **Related items share ONE panel** (`.me-tabs`, `.me-rail`). Dividers between items are detached (never touch the frame) and visible even unlit. Where no group exists, there is no panel: the area is bare canvas.
3. **Light source propagation.** The selected item's leading edge (top for tabs, left for rails) is the source. Attached outer frame edges carry the light fading away from the source. Detached dividers become their own source: a centred bar fading at both ends, lit on the selected item's side.
4. **Every alert is full-perimeter** (info, ok, warn, err). Severity is the colour and glyph, not whether it glows.
5. **Notifications are a notch:** top-centre, open from the middle outward, only the bottom edge lit and it appears first. No left-edge light. One at a time.
6. **Opposing actions** (`.me-pair`): only the "hot" one wears the full perimeter; the heat moves to whichever was clicked. Both rest states are in the gallery to compare.
7. **Loading buttons:** the edge light orbits the perimeter, top-left, anticlockwise. Icon buttons do not get this.
8. **Checkbox and radio are plain:** real box with a tick, square with a dot, no light. The switch is the only selection control that emits light, and its light trails back across the track when on.
9. **Row selection vs hover must be distinguishable:** hover = faint short bar + faint wash, selected = bright wider bar + gradient wash.
10. **Badges** are lit from the floor (wash + short bottom bar); **status beacons** are a vertical light-bar, never a dot. Buttons light the top, fields the sides, badges the floor.
11. Approved from the lab: D′ (3 fading edges, illumination levels), E′ (critical), G (split), I′ (single-panel list), K (field ticks). Not adopted: B′, F′, H′, J′ as drawn.

Open after round 4:
- [ ] Pair rest state: literal reading (risky one hot at rest) vs safe one hot at rest; both shown in gallery 01
- [ ] Badges/beacons are a first pass; expect another round
- [ ] Radio is a square with a square dot (no circles rule). One-line change if you want a round dot
- [ ] Rails on narrow screens switch to `data-axis="x"` through JS (matchMedia); consider a CSS-only container-query version
- [ ] `.me-tabs` overflow hint still missing

## Round 4b (decisions)
- [x] Opposing pair: the SAFE action is lit at rest (decided)
- [x] Radio stays a square with a square dot (decided)
- [x] Signal colours are standard: red critical, amber warning, green ok. Notice (`info`) is sky blue, no more indigo/purple. Garden "Healthy" is now green, "Harvest soon" is notice blue
- [x] Alerts radius 4px; notch animation 1.5s in / .8s out, dwell ~4.7s
- [x] Side nav v2 (from concept image): brand mark, icon + label rails, footer icon group, collapse to icon rail with hover tags. Icon spec in `.me-ico`; icons live as an inline SVG sprite in garden.html
- [ ] Collapsed rail hides count badges; decide on a tiny beacon instead
- [ ] Icons are a 9-icon first set; the full ~40 set still to draw
- [ ] Badges revamp (deferred by you)

## Round 5: tests (npm test)
- [x] Playwright (Edge, no download) + axe: `tests/garden.spec.js` (behaviour + design rules R1-R9, desktop and phone), `tests/a11y.spec.js` (axe WCAG 2.2 AA on every garden state in both themes), `tests/tracking.spec.js`
- [x] garden.html is the deployment: component coverage is tracked by `tests/coverage-baseline.json` (known gaps). New component not in garden = failing test
- [x] Animation registry: `tests/animations.json`, every @keyframes must be listed
- [x] Bugs found by the tests: collapsed rail buttons had no accessible name; touch 44px floor was invalid CSS (self-referencing var) so buttons collapsed to 20px on touch
- Run: `npm test` (all), `npx playwright test --project=phone`, `npx playwright show-report`

## Round 5b: coverage gaps closed
- [x] garden.html now exercises all 68 framework components (baseline is empty). Added: pager (beds), tabs + nav + nav-end + table-empty + truncate (users), accordion + stepper (irrigation), btn-group (tasks filter), pair (frost protocol), skeleton (recent activity)
- [ ] Badges: you want an innovative non-colour-coded, non-glowing design, or plain with no edge lighting. Options to prototype next
- [x] Select dropdown options were black-on-dark in the open list (invite role). Fixed with explicit option colours + a test in both themes
- [ ] Badge candidates A glyph / B tag / C notch are in monoedge.css and badge-lab.html; coverage baseline lists them until one is chosen and moved into garden

## Round 6
- [x] Rule 4b: a critical DECISION dialog lights top/left/right only; the bottom edge stays dark so the options (split footer) stay readable
- [x] Badges: typographic tag chosen. Plain "[ 10 ]"; warn = bracketed UPPERCASE bold; status and critical = solid block (`.me-badge--fill`, auto for err). Light theme uses the darker text-colour as fill so white text passes AA. Candidates A and C and badge-lab.html deleted
- [x] Badge rule: only a STATUS gets a fill (`.me-badge--fill`). Everything else (roles, counts, due dates) is plain unboxed text, no brackets. Roles are neutral, no signal tint
