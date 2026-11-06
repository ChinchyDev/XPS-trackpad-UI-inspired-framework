# How EdgeLit works

The ideas, and how they are built. For people who want to understand it, extend it, or judge it.

## 1. The idea

Dell's 2024 laptops had an *invisible* trackpad and people could not find its edges. The 2026 model added thin etched boundary lines. That is the thesis: **a control may be unboxed, but never unlocatable.** EdgeLit removes boxes, shadows and fills, and keeps one cue (an edge of light) that says "here is something you can use" and, by brightness, "this is how engaged it is".

So light is the vocabulary:

- **Where** it sits tells you what the thing is (buttons: top; fields: the sides; tabs and rails: the selected item's leading edge; alerts: all around; the notification notch: the bottom).
- **How bright** tells you the state (rest 20%, hover 60%, pressed 100%).
- **What colour** tells you meaning (accent for interaction; red, amber, green, sky-blue for severity).

The sixteen rules in `DESIGN.md` are this thesis made specific (e.g. "badges: only a status gets a fill", "radius never above 4px", "checkboxes are plain; only the switch emits light").

## 2. Architecture

```
edgelit.css                  one file, five cascade layers
  @layer reset, tokens, base, components, utilities
dist/tokens.css              generated design tokens (colours, spacing, radii, type, motion)
dist/fallback.css            generated: colour fallback for browsers without color-mix()
edgelit.js                   optional behaviour (window.ME)
edgelit-elements.js          optional custom elements over edgelit.js
edgelit-icons.js             inline SVG sprite
```

**Cascade layers.** Every rule lives in a layer. A page's own un-layered CSS beats all of them, whatever the specificity, so overriding the framework never needs `!important`. The one deliberate exception: the reduced-motion rule lives in `reset` (earliest layer) because `!important` inverts layer order, which makes it win over everything.

**Tokens.** Colours, spacing, radii, type and motion are authored once as W3C Design Tokens JSON (`tokens/*.tokens.json` in the source) and compiled with Style Dictionary into CSS variables, JS and JSON, and a Tailwind preset. Signal colours are authored in OKLCH. A build step checks every text/background and control/background pair in both themes against WCAG contrast (4.5:1 for text, 3:1 for boundaries and light-bars) and fails the build if any pair drops below. A script derives a full accent (both themes) from one seed colour by moving only lightness, only as far as needed.

**Signal scopes.** `data-signal="warn"` on an element sets three variables (`--sig`, `--sig-text`, `--sig-rgb`). Every component draws its light from `--sig` (default: the accent), so one attribute re-colours a whole subtree consistently.

**Light as CSS.** Edges are pseudo-elements (`::before`, `::after`) with a gradient that fades away from a source, an inset 1–2px light-bar, and an optional glow from `box-shadow`. Intensity is a variable (`--lit-level`), so rest/hover/pressed are just three values. Dark theme uses glow (light emitted onto a dark surface); light theme uses an etched edge and a faint wash (light cannot glow on a bright surface).

**Responsive by container.** Grids, navs and dialogs use container queries (`container-type: inline-size`), so a component adapts to the room it has, not to the screen. There are no viewport width media queries.

**Right-to-left.** All spacing, alignment and positioning use logical properties. The few things that cannot be logical (shadow offsets, translations, gradient angles) are multiplied by `--dir` (1 or -1). Direction-bearing icons carry `data-flip`; arrow keys follow the reading direction.

**Preference queries.** `prefers-reduced-motion` (no orbit, no fades; states still change), `prefers-contrast: more` (stronger strokes), `forced-colors` (native scrollbars and system colours return), `print` (light page, dark ink), and `color-scheme` are all handled and tested.

## 3. The JavaScript

It is optional. Buttons, fields, tabs (styling), tables, alerts, badges, panels and `<dialog>` modals need no script at all (a test loads a page with scripts blocked and checks they stay styled). Script is only for things CSS cannot do:

| Helper | Why script |
|---|---|
| `ME.chart` | draws SVG, labels, accessible data table |
| `ME.datepicker`, `ME.combobox` | popover positioning, keyboard model, filtering |
| `ME.palette` | command palette |
| `ME.upload` | drag and drop, validation |
| `ME.tree`, `ME.toolbar`, `ME.wizard`, `ME.split` | roving focus and state |
| `ME.scroll` | the lit scroll thumb and edge lights (native scrolling is kept) |

Popovers use the Popover API in the top layer, and are mounted inside an open `<dialog>` when needed (otherwise a modal makes everything outside it inert).

The custom elements (`<me-date>`, `<me-combobox>`, `<me-switch>`, `<me-chart>`, `<me-icon>`, `<me-scroll>`) use the *light* DOM on purpose: the framework's CSS applies unchanged, forms see real `<input>`s, and assistive technology sees ordinary markup.

## 4. Accessibility, as a feature

WCAG 2.2 AA is the floor: text 4.5:1, boundaries 3:1, 24px minimum targets (44px on touch), visible focus (fields get a second cue for 2.4.13), never colour alone, labelled everything. ARIA Authoring Practices patterns are followed for tabs, menu, dialog, switch, accordion, listbox, tree and toolbar. Every chart has a text equivalent.

## 5. How it is tested (in the source project)

About 350 automated tests, in Chromium, Firefox and WebKit: behaviour of every component, axe accessibility audits in both themes and right-to-left, visual regression screenshots (dark, light, RTL, phone, fallback forced on), a locatability sweep (every control shows an edge cue at rest), performance budgets (CSS 21 KB gzipped against a 30 KB budget), and generated-file freshness checks (tokens and fallback must match their sources). This zip ships the built output; the test suite and build scripts live in the source repository.

## 6. Decisions worth knowing

- **Why `me-` and `ME`?** A short, namespaced prefix for classes and the global; kept from the project's earlier working name.
- **No React wrapper.** Custom elements cover it; React 19 supports them natively.
- **Radius cap 4px, no circles.** Sharp reads as precise; a slight radius invites touch; circles are a different visual language.
- **Fonts: Jost and Cormorant Garamond.** A geometric sans (quiet, premium) for interface and a high-contrast serif for titles and large numbers, to avoid the "dashboard monospace" look.
- **Fonts online only in this zip.** They come from Google Fonts (privacy note: that sends visitors' IP addresses to Google; self-host the two families if that matters for your site).

## 7. Extending it

Keep to the rules in `DESIGN.md`. To add a component: build it from tokens, give it one lit edge that follows the light vocabulary, make it reachable and labelled with the keyboard, check it in dark, light and RTL, and make sure it is locatable at rest. To add an icon: 16px grid, 1.25 stroke, straight segments only (no circles or curves), one lit segment (`--ico-l`).
