# Edge-Lit Framework: Road to v1.0

Design thesis (from XPS 14/16 2026): **flush surfaces + minimal edge indicators.**
The 2024 invisible trackpad failed because users couldn't find its edges; the 2026 model added etched boundary lines. Rule: *a control may be unboxed, but never unlocatable.*

Legend: [ ] todo · [x] done · (D) needs your decision
Workflow: **garden.html is the deployment.** Every component is exercised there, and `npm test` enforces it (see Testing).

---

## 1. NEXT UP (in order)

### 1A. Missing components, built in garden first
Each one must pass the Design Rules below, appear in garden, and come with a Playwright test + axe pass in both themes.
1. [x] **Line / area chart** (Overview and a new Telemetry view). Hairline axes, light-bar series, sparkline variant. Done in garden (Telemetry view, `.me-chart` + `.me-spark`, `chart()` helper). Still to do: replace the placeholder in dashboard.html
2. [ ] **Date and time picker** (e.g. harvest date on a bed, task due date)
3. [ ] **Combobox / autocomplete** (zone or crop on the bed form, global search suggestions)
4. [ ] **Command palette** (opened with Ctrl+K, jump to view or bed)
5. [ ] **File upload** (bed photo)
6. [ ] **Tabs overflow hint** (scrolled tab strip hides tabs on phones)
7. [ ] Tree view, multi-select, tag input, toolbar, stepper / wizard (lower priority)
8. questions asked earlier Decisions 

Should collapsed-rail counts become a tiny beacon? D.....YES
Should fields get a second focus cue so they meet WCAG 2.4.13. D...YES

### 1B. Gaps in what already exists
- [ ] Collapsed side rail hides count badges; show a tiny beacon instead (D)
- [ ] Fields: ticks are the ONLY focus cue, so WCAG 2.4.13 (AAA) is not met. Add a second cue? (D)
- [ ] Measure idle field boundary (faded ticks) against 1.4.11 (3:1)
- [ ] No neutral / undo state for the split footer
- [ ] Illumination levels (`data-lit-hover`) not wired to every lit control
- [ ] Light-mode lighting is still the weakest area (etch + wash): needs its own review pass
- [ ] Rails switch to horizontal through JS `matchMedia`; make it CSS-only (container query)
- [ ] Remove the unused legacy `me-scan` once nothing needs it, and keep `tests/animations.json` in sync

### 1C. Icons
- [ ] Draw the full ~40-icon set (9 exist in garden.html: overview, beds, irrigation, tasks, users, collapse, settings, docs, help). Spec: 16px grid, 1.25 stroke, square caps, mitre joins, no circles, one segment lit via `--ico-l`
- [ ] Move the sprite out of garden.html into its own file
- [ ] Icon-button sizing and hit-area rules

### 1D. Delivery (do after 1A so the API is settled)
- [ ] Tokens as W3C DTCG JSON, built with Style Dictionary to CSS / Tailwind / JS (one source of truth)
- [ ] OKLCH colours so a new accent is derived and auto-checked for 4.5:1 / 3:1
- [ ] CSS cascade layers (`reset, tokens, base, components, utilities`)
- [ ] Logical properties everywhere (RTL); container queries for components
- [ ] Web Components wrappers; React wrapper only where it earns its place
- [ ] `color-mix` fallback for older Safari / Firefox

---

## 2. TESTING (done, run `npm test`)
- `tests/garden.spec.js`: behaviour of every garden view + the design rules, desktop and phone (`@responsive`)
- `tests/a11y.spec.js`: axe WCAG 2.2 AA on 10 garden states x dark/light
- `tests/tracking.spec.js`:
  - **component coverage**: every `.me-*` class in monoedge.css must appear in garden.html or be listed in `tests/coverage-baseline.json` (currently empty: all 69 covered)
  - **animation registry**: every `@keyframes` must be listed in `tests/animations.json`
  - runtime checks: notch duration and reduced motion, loading orbit direction
- Bugs these tests found: collapsed rail had no accessible name; touch 44px floor was invalid CSS (self-referencing var); amber fill with light text failed contrast; select options black-on-dark
- Still to add: visual regression screenshots (dark, light, compact, roomy), Firefox + WebKit projects, automated contrast test over every token pair, screen reader pass (NVDA + VoiceOver)

---

## 3. DESIGN RULES (decided; new components must pass these)
1. **Backgrounds are never extreme.** Dark: canvas `#14171d`, panel `#1b1f27`, surface `#222731`, overlay `#2a303c`. Light: canvas `#dadee3`, panel `#e9ecef`, surface `#f0f2f4`, overlay `#f4f6f7`. No pure black or white.
2. **Related items share ONE panel** (`.me-tabs`, `.me-rail`). Dividers between items are detached (never touch the frame) and visible when unlit. Where no group exists there is no panel: bare canvas.
3. **Light source propagation.** The selected item's leading edge (top for tabs, left for rails) is the source. Attached outer edges carry the light fading away from it. Detached dividers become their own source: a centred bar fading at both ends, lit on the selected item's side.
4. **Every alert is full perimeter** (info, ok, warn, err). Severity is colour + glyph.
   - 4b. A critical **decision** dialog lights top / left / right only. The bottom edge stays dark so the options are readable.
5. **Notifications are a notch:** top-centre, open from the middle outward, only the bottom edge lit and it appears first. One at a time. 1.5s in, 0.8s out, about 4.7s dwell.
6. **Opposing actions** (`.me-pair`): only the hot one wears the full perimeter; the safe action is hot at rest; heat follows the click.
7. **Loading buttons:** the edge light orbits the perimeter, from top-left, anticlockwise. Icon buttons do not.
8. **Checkbox and radio are plain:** box with a tick, square with a square dot, no light. The switch is the only selection control that emits light; its light trails back across the track when on.
9. **Row hover vs selected must differ:** hover = faint short bar + faint wash; selected = bright wider bar + gradient wash.
10. **Badges:** only a STATUS gets a fill (`.me-badge--fill`: solid block, reversed text). Everything else (roles, counts, due dates) is plain unboxed text with no brackets and no signal tint unless it is a warning. Status beacons are a vertical light-bar, never a dot.
11. **Signal colours are standard:** red critical, amber warning, green ok, sky blue notice. No other hues.
12. **Light placement vocabulary:** buttons light the top, fields the sides (ticks), switch trails, tabs/rails per rule 3, alerts the full perimeter, notch the bottom.
13. **Radius is capped at 4px** (policy below).
14. Approved from the elevation lab: three fading edges with illumination levels, critical full perimeter, split footer, single-panel list, field ticks. Shadows are not used on overlays; separation = raised surface + frame + blur scrim.

---

## 4. DECISIONS LOG
- [x] Accent = cyan (`#22d3ee` dark / `#0e7490` light), overridable via `--accent`
- [x] Radius policy approved; radio = square; typography changed from all-mono to Jost (UI) + Cormorant Garamond (titles, big figures, brand): premium, less dashboard-like
- [x] Delivery: CSS first, then Web Components; React wrapper only where it fits
- [x] Opposing pair: safe action lit at rest. Radio stays square-dotted.
- [x] Badge design: typographic; status filled, everything else plain
- [x] Side nav concept (brand, icon rails, footer icon group, collapse to icon rail with hover tags) adapted from the supplied image

## 5. LATER (quality, standards, release)
**Quality and standards**
- [ ] Full WCAG 2.2 AA audit by hand (1.4.3, 1.4.11, 1.4.1, 2.4.7, 2.4.11, 2.5.8, 3.3.1) on top of axe
- [ ] Cross-browser pass: Chrome, Firefox, Safari
- [ ] Performance budget: CSS under 30 KB gzipped, no JS for core components
- [ ] Reduced-motion, forced-colors, high-contrast, print verified
- [ ] Locatability rule: every interactive zone shows at least one edge cue at rest
- [ ] Haptics and press micro-travel; guard against accidental activation of large flush zones; a literal 2D trackpad-style pad control

**Release**
- [ ] Name and logo
- [ ] Docs site generated from garden (one page per component, do / don't)
- [ ] Package (npm), semver, changelog, licence
- [ ] Regenerate the spec document from the tokens (no hand-maintained duplicates)

---

## Radius policy
Principle: corner radius is a *signal*, not decoration. Sharp reads as precise and structural; slightly softer invites touch. Nested radii: `inner = outer - gap`.

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Dividers, grid cells, table cells, tabs, split panels, anything touching a neighbour |
| `--radius-micro` | 2px | Inputs, checkboxes, kbd, status fills |
| `--radius-soft` | 3px | Buttons, segmented controls, group panels |
| `--radius-float` | 4px | Floating layers: modals, menus, tooltips, notch, alerts |
| circle | never | |

Hard cap: **4px** (enforced by a test).

## Standards to adopt
- **WCAG 2.2 AA**: text 4.5:1, non-text and control boundaries 3:1, target size at least 24px (2.5.8), visible focus, no colour-only meaning.
- **WAI-ARIA Authoring Practices**: tabs, menu button, dialog, switch, accordion, grid, listbox.
- **Touch targets**: 44x44 via `pointer: coarse` (verified by test).
- **W3C Design Tokens (DTCG)** + Style Dictionary.
- **User preference queries**: colour scheme, reduced motion, contrast, forced colours.
- **Watch, don't adopt yet**: APCA (WCAG 3 draft).

## Archive (history, all resolved)
- Round 1-3: first-pass components, contrast fixes (dark `--stroke-control` was 2.88:1 and was corrected), light-mode etch + wash, garden app, grid / table / link / `hidden` bugs
- Round 4-6: backgrounds softened, grouped panels, notch toasts, simple checkbox/radio, switch trail, side nav v2, tests, coverage gaps closed, badge redesign
