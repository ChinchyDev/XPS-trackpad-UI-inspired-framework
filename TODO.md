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
