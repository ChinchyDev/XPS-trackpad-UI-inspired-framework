# EdgeLit: Road to v1.0

Design thesis (from XPS 14/16 2026): **flush surfaces + minimal edge indicators.**
The 2024 invisible trackpad failed because users couldn't find its edges; the 2026 model added etched boundary lines. Rule: *a control may be unboxed, but never unlocatable.*

Legend: [ ] todo · [x] done · (D) needs your decision
Workflow: **garden.html is the deployment.** Every component is exercised there, and `npm test` enforces it (see Testing).

---

## 1. NEXT UP (in order)

### 1A. Missing components, built in garden first
Each one must pass the Design Rules below, appear in garden, and come with a Playwright test + axe pass in both themes.
1. [x] **Line / area chart** (Overview and a new Telemetry view). Hairline axes, light-bar series, sparkline variant. Done in garden (Telemetry view) and in dashboard.html. Variants covered: area, multi-series with legend, stepped, below-zero, gaps, compact large numbers, 90-point dense, single / flat / empty, sparkline in stat cards
2. [x] **Date and time picker** (e.g. harvest date on a bed, task due date)
3. [x] **Combobox / autocomplete** (zone or crop on the bed form, global search suggestions)
4. [x] **Command palette** (opened with Ctrl+K, jump to view or bed)
5. [x] **File upload** (bed photo)
6. [x] **Tabs overflow hint** (scrolled tab strip hides tabs on phones)
7. [x] Tree view, multi-select, tag input, toolbar, stepper / wizard (lower priority)
8. questions asked earlier Decisions 

Should collapsed-rail counts become a tiny beacon? D.....YES
Should fields get a second focus cue so they meet WCAG 2.4.13. D...YES

### 1B. Gaps in what already exists (all done; tests in `tests/polish.spec.js`)
- [x] Collapsed side rail: count badges become a tiny vertical light-bar (signal colour, hidden at zero); the number stays in the accessible name
- [x] Fields: second focus cue (2px bar top and bottom in the signal colour, plus the ticks) for WCAG 2.4.13; error fields keep red
- [x] Idle field boundary measured against 1.4.11: ticks are 3.3:1 or better on every surface in both themes (automated, tolerance 3:1)
- [x] Split footer neutral / undo: click the chosen side again, or Esc (`ME.split`, used in dashboard.html). Dialog footers still commit and close
- [x] Illumination levels: every interactive `.me-lit` control (button, link, menuitem, tab, switch, summary) gets rest .2 / hover .6 / pressed 1 automatically; `data-lit-level` overrides; static lit surfaces (dialogs, menus) are untouched
- [x] Light-mode lighting review pass: lit-edge wash cut to 6% in light (it read as a smudge), calendar disabled days no longer struck through, axis ticks on round numbers, upload zone layout. Re-review by eye after the next round
- [x] Rails lie on their side by CSS container query (`.me-side` >= 280px, footer group >= 140px). `data-axis="x"` remains as a manual override. No JS
- [x] Removed legacy `me-scan`; the busy split button now orbits like a busy button (rule 7); `tests/animations.json` in sync
- Follow-up: the horizontal-rail rules now exist in three copies (data-axis, two container blocks). A build step (1D) should generate them from one source

### 1C. Icons (done; tests in `tests/icons.spec.js`)
- [x] 46 icons drawn (the 9 + telemetry + components, plus 35 new): navigation, actions, direction, status, time / weather / garden. 16px grid, 1.25 stroke, square caps, mitre joins, straight segments only (no circles, arcs or curves), exactly one lit segment each via `--ico-l`
- [x] Sprite moved out of garden.html: `icons/sprite.svg` is the source of truth; `npm run build:icons` generates `edgelit-icons.js`, which injects it (external `<use>` is blocked on file://). A test fails if the generated file is stale
- [x] Icon-button sizing: `.me-ico--sm / --lg / --xl` (12 / 20 / 24); any icon-only button is at least 24px (WCAG 2.5.8), 44px on touch, and must have an `aria-label` (tests sweep the whole garden)
- [x] `ME.icon(name, size)` for JS-built UI; calendar trigger, month arrows, upload remove, dialog close and pager now use the sprite
- [x] Icon gallery in the Components view (hover lights the segment)
- Lab: `icons.html` exercises all of it (playground with a 16x zoom and safe margin, the full set, size ladder, buttons in 12 contexts, a live hit-area inspector, a contrast matrix, the JS helper). It found two real gaps that are now fixed: toolbar and pager targets were 40-42px on touch
- Follow-ups: hand-check the 1.25 stroke on a 16px grid for blur on a 1x display; more icons as components need them (home, image, star, logout, map); `link` and `refresh` could be revisited; the lit segment has no static (non-hover) use yet, e.g. an "active" tint

### 1E. Scrollbar (decided and built: B + C; tests in `tests/scroll.spec.js`; lab deleted)
Decision: a combination. **Lit thumb (B)** is the default for most content and the drag handle when the wheel is not available; **edge lights (C)** are added on small scrollers and lead on touch. Always accent, hidden at rest.
- [x] `ME.scroll(el)` / `data-me-scroll`; styles in edgelit.css 10n. Native scrolling, keyboard and find-in-page untouched; the browser bar is hidden, and comes back in forced-colors
- [x] Thumb: 2px accent light-bar, shows on hover / focus / while scrolling, fades after ~1s, swells and glows when grabbed, drag + click-track paging, both axes with a corner piece, hidden when content fits
- [x] Edge lights: lit edge + content fade toward more content. Auto: on when the scroller is small (height <= 320px, width <= 480px) and always on touch; `data-me-scroll="on|off"` overrides
- [x] Touch: thumb only while scrolling (never on hover), 24px track
- [x] A scroller with nothing focusable inside gets `tabindex=0` so the keyboard can reach it
- [x] In use: garden table wraps, modal bodies, dashboard table; demos in the Components view
- Follow-ups: apply to the combobox / palette listboxes and the tree; thresholds (320 / 480) are a first guess, tune on real content; wrapper copies no flex/grid placement from the scroller (wrap a flex child in your own container); a `scroll-padding` / sticky-header check on long tables

### 1D. Delivery (done; tests in `tests/delivery.spec.js`, `rtl.spec.js`, `elements.spec.js`, `visual.spec.js`)
- [x] **Tokens as W3C DTCG JSON** in `tokens/` (core, dark, light), built with **Style Dictionary 5** into `dist/tokens.css`, `tokens.js`, `tokens.json` and `tailwind.preset.js`. edgelit.css imports the generated CSS into its `tokens` layer. `npm run build:tokens`
- [x] **OKLCH**: signal colours are authored in OKLCH. A build **gate** checks every pair (text 4.5:1, light-bars and control edges 3:1) in both themes and fails the build. `node scripts/derive-accent.js "<any colour>" [--write]` derives a whole accent (fill + text, both themes) from one seed, moving only lightness and only as far as needed
- [x] **Cascade layers**: `reset < tokens < base < components < utilities`, every rule is in one; a page's own un-layered CSS beats the framework with no specificity tricks
- [x] **Logical properties** everywhere (`scripts/logicalize.js` did the conversion), plus a `--dir` (1 / -1) multiplier for the things that cannot be logical (shadow offsets, translations, gradient angles). **RTL** works: `dir="rtl"` mirrors layout, lit leading edges, switch travel, scroller thumbs and edge lights, directional icons (`data-flip`), calendar and tree and toolbar and tabs arrow keys; charts keep a left-to-right time axis. Try it: palette > "Switch to right-to-left", or `garden.html#app-rtl`
- [x] **Container queries**: no viewport width media queries are left; grids, navs and dialogs answer to their own width (rails already did)
- [x] **Web Components** (`edgelit-elements.js`): `<me-icon> <me-chart> <me-scroll> <me-date> <me-combobox> <me-switch>`. Light DOM, attribute and property driven, form-friendly (real inputs, hidden inputs for multi values), events bubble
- [x] **React**: no wrapper (decided). React 19 passes props to custom elements as properties and wires events; older React sets properties through a ref. A wrapper would only be worth it for typings; revisit if a React app needs them
- [x] **color-mix() fallback**: `dist/fallback.css` (generated) re-emits every alpha `color-mix` as `rgb(var(--x-rgb) / P)` under `@supports not`, including custom properties. A test forces it on and checks it looks identical to color-mix
- [x] **Visual regression** (was on the "still to add" list): 50+ baselines (dark, light, RTL, phone, fallback forced on); the safety net for all of the above
- Real findings the gate and tests produced: light **OK** and **warning** light-bar colours were 2.79:1 and 2.36:1 (below 3:1), now darkened just enough; the scroller corner piece drew a dark square in every modal; the phone nav strip scroll depended on font load timing
- Follow-ups: prefers-contrast stroke overrides are still hand-written (move into a `contrast` token set); RTL leftovers: `.me-lit` left/right edges, split-footer corner radii and gradient positions, non-inset shadow offsets, radial-gradient anchors; the horizontal-rail rules exist in three copies (generate them in the build); typography scale (sizes, tracking) is not tokenised yet; a single `dist/edgelit.css` bundle (inline the imports) belongs to Release packaging

---

### 1A notes (all built; behaviour lives in `edgelit.js`, styles in `edgelit.css` sections 10e-10m)
- Everything is in garden: Telemetry (charts), Components view (date/time, combobox, multi-select, tag input, upload, tree, toolbar, wizard, tabs overflow). Also wired into real flows: bed form (crop combobox, harvest date, photo), task due date, global search suggestions, Ctrl+K palette.
- Popovers are top-layer and mounted inside an open `<dialog>` (otherwise a modal makes them inert).
- Follow-ups: mobile pass on the popovers (date picker and listbox on phones), `Intl` locale for the calendar (en-GB hard-coded), upload progress / real network upload, tree multi-select + typeahead, chart legend toggling and keyboard-reachable data points, bar chart variants (stacked, negative).

## 2. TESTING (done, run `npm test`)
- `tests/garden.spec.js`: behaviour of every garden view + the design rules, desktop and phone (`@responsive`)
- `tests/a11y.spec.js`: axe WCAG 2.2 AA on 15 garden states x dark/light (incl. telemetry, components, palette, date picker, search suggestions)
- `tests/library.spec.js`: chart variants, date/time picker, combobox / multi-select / tag input, palette, upload, tabs overflow, tree, toolbar, wizard
- `tests/tracking.spec.js`:
  - **component coverage**: every `.me-*` class in edgelit.css must appear in garden.html or be listed in `tests/coverage-baseline.json` (currently empty: all 69 covered)
  - **animation registry**: every `@keyframes` must be listed in `tests/animations.json`
  - runtime checks: notch duration and reduced motion, loading orbit direction
- Bugs these tests found: collapsed rail had no accessible name; touch 44px floor was invalid CSS (self-referencing var); amber fill with light text failed contrast; select options black-on-dark
- Still to add: visual regression for compact / roomy density, Firefox + WebKit projects, automated contrast test over every token pair, screen reader pass (NVDA + VoiceOver)

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
- [x] Cross-browser pass: Chromium, Firefox and WebKit projects run the whole suite (visual baselines stay Chromium-only). Real bugs found and fixed: **Safari does not focus a clicked button, so Esc never reached the split footer** (the footer now focuses the clicked button); a native `<select>` got a 5px radius in WebKit (over the 4px cap). Test-side: WebKit freezes colour transitions on off-screen elements (axe read half-way colours; axe tests now measure the settled state); Firefox's Playwright emulation of forced-colors / prefers-contrast flips `matchMedia` but does not restyle, so those two tests skip on Firefox (verify by hand in a real Firefox with Windows high contrast)
- [x] Performance budget (`tests/quality.spec.js`): CSS a page loads is 21 KB gzipped (budget 30), JS 13 + 3 + 1.5 KB, core components styled with scripts blocked, no third-party request except the optional Google Fonts import
- [x] Reduced-motion, forced-colors, high-contrast, print verified (`tests/quality.spec.js`). Finding: these all hang off the `.me` scope class on `<body>`; a page without it silently loses them, so the agent guide and the starter now require it
- [x] Locatability rule: every interactive zone shows at least one edge cue at rest (automated sweep of 6 garden views; exempt: breadcrumb links, range slider whose track is the cue)
- [ ] Haptics and press micro-travel; guard against accidental activation of large flush zones; a literal 2D trackpad-style pad control

**Release**
- [x] **Agent kit** (`agent-kit/`): one folder with `DESIGN.md` (philosophy, 16 hard rules, generated token tables, component markup, page recipes, a11y floor, do/don't, checklist), the working framework, `tokens.json`, a Tailwind preset and `examples/starter.html`. Point an agent at it. Tests keep it current, self-contained, and truthful (every class and `ME.*` call it names exists; its starter passes axe in both themes)
- [x] Name: **EdgeLit** (files, package, docs renamed). Kept the short `me-` class prefix and `ME` global (a rename would touch every class, test and baseline; decide later). Logo still to do
- [x] **Release zip for friends** (`npm run build:release` -> `release/EdgeLit-1.0.0.zip`, tested in `tests/release.spec.js`): framework without font files (Google Fonts online only, system fallback offline), README, user guide, how-it-works, DESIGN.md, NOTICE, placeholder LICENSE.txt, examples (starter, garden, dashboard). Zip made with bsdtar (PowerShell 5.1 Compress-Archive writes backslash paths that break on Mac/Linux). Source docs in `docs-src/`
- [x] Docs: README, USER-GUIDE, HOW-IT-WORKS ship in the zip; a generated per-component docs site is not needed for private use
- [x] **Licence: MIT** (version 1.0.0). `LICENSE` at the repo root, `docs-src/LICENSE.txt` in the zip (with a version header line), `"license": "MIT"` in package.json. Copyright holder is `ChinchyDev` (change it if you want a legal name). Repo stays private for now
- [x] **Font licences:** the full OFL 1.1 texts are in `fonts/OFL-Jost.txt` and `fonts/OFL-Cormorant.txt` (fetched from the upstream font repos); `docs-src/NOTICE.md` says the fonts keep their own licence. Still open: the agent-kit copy (`agent-kit/fonts/`) does not carry the OFL texts, and `kit-src/LICENSE-FONTS.md` still says "TODO before public release". Do those if the repo or kit goes public. Still undecided: keep the Google Fonts `@import` in the shipped CSS (privacy / GDPR: it sends visitors' IPs to Google) or only the self-hosted copy
- [ ] **Marketing kit** (optional add-on): scoped in `docs-src/MARKETING-KIT-SCOPE.md`, not built
- [x] Spec regenerated from the tokens: `agent-kit/` (`npm run build:kit`, tested in `tests/kit.spec.js`). The old hand-written spec (`monolithic_edge_lit_ui_framework.md`) and `GAP_REVIEW.md`, `elevation-lab.html`, `m_tmp.html` were deleted (still in git history)

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
