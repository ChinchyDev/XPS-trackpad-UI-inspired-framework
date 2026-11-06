# Scope: EdgeLit Marketing Kit (optional add-on)

Status: **scoped, not built.** This is a plan for review, written after building the VORTEX Esports example site (`examples/vortex-esports/`).

## Why it exists

The VORTEX build needed about 360 lines of page CSS and about 190 lines of JS for things the core does not provide: the nav, hero, card systems, footer, section layout, reveal and counter animations, and page transitions. Every marketing-style site will rewrite them. The core stays an application UI kit, and the add-on is opt-in.

## What goes in the kit

**Layout and type**
- Page shell: wrapper, section spacing, background bands, section header with eyebrow label and link, split layouts.
- A display type scale for headlines and a "lead" paragraph style.
- Page-as-scroller wrapper, so the lit scrollbar works on full pages (the browser's native bar otherwise shows on the document).

**Navigation**
- Sticky header with active-link indicator.
- Mobile menu with Esc to close, `aria-expanded` and a close-on-resize rule.
- Footer with link columns.
- Breadcrumbs already exist in the core.

**Hero**
- Full-bleed hero with a content slot, page-header hero, and an announcement or ticker bar.

**Cards and content blocks**
- Media card (image on top), overlay tile, split feature row (alternating), person card, and logo wall.
- Stat band with count-up numbers, numbered values grid, timeline, and newsletter or call-to-action band.
- Article layout: headline, hero image, reading column, pull quote, share bar, previous/next, related.

**Forms**
- Selectable option cards (radio), form grid, textarea, inline form.
- A validation helper that sets the core's error state.
- A newsletter form pattern.

**Behaviours (one small JS file)**
- Reveal on scroll, count-up numbers, page transitions, toasts, a filter-bar helper, and a helper that gives script-added tables the lit scrollbar.
- Everything honours reduced motion.

## What stays out

- **Match rows, live cards and brackets:** esports-specific. Offer them as a "sports" recipe in the examples folder, not in the kit.
- **The art generator and mock data:** the generator stays a VORTEX example. A kit should not ship fake imagery.
- **Page templates:** four starters (landing, list, detail, form) go in the examples, not the kit.

## Packaging

- **Files:** `edgelit-marketing.css` and `edgelit-marketing.js`, loaded after `edgelit.css`. The core is untouched, and the add-on is a separate download or folder.
- **CSS layers:** the core declares `reset, tokens, base, components, utilities`. The add-on adds a `marketing` layer after `components`, so page CSS still wins.
- **Tokens:** `--mk-*` variables for the band shades, section spacing and display font. They are defined once, and the kit needs no other colour values.
- **Release:** `scripts/build-release.js` would include the add-on and the four starters as an optional folder.

## Rules to settle before building

The VORTEX CSS broke some core conventions, and the kit cannot.

1. **Right-to-left:** the core is fully RTL-tested. The VORTEX CSS has a couple of physical-direction spots (`float: left` on the drop cap, timeline padding). The kit must use logical properties only, and the core's RTL tests should run against it.
2. **Gradients, blur and text shadow:** the core rules forbid gradients on surfaces. The hero scrims, the glass header and the player alias shadow all break that. Write a narrow exception: image scrims and a glass header are allowed, surfaces are not.
3. **Type:** VORTEX used Jost uppercase for headlines, but the core's headline font is Cormorant. Make the display font a token that defaults to the core's, so each brand picks its own.
4. **Contrast gate:** the kit uses only core tokens, so it inherits the gate. Any new colour pair it adds, such as text on an image scrim, needs a rule and a test.

## Work breakdown

1. **Extract and generalise (about a day):** move the reusable CSS out of `vortex.css`, rename it, make it RTL-safe and add tokens.
2. **JS module (half a day):** split `site.js` into kit behaviours and VORTEX-specific parts.
3. **Tests (about a day):** a11y checks, responsive checks at three widths, RTL checks, reduced motion and keyboard checks for the menu, following the core's existing test style.
4. **Docs and starters (about a day):** a user-guide section, a component reference and the four starter pages.
5. **Rewire VORTEX onto the kit:** this proves the kit is enough. Success means `vortex.css` shrinks to brand tokens plus the sports-specific pieces.

Roughly 3 to 4 days. The riskiest item is the rule exceptions in point 2, because they change what the "EdgeLit look" means.

## Open decisions

- **Name and home:** same repo in a `marketing/` folder, or a separate repo?
- **Headline font:** keep Cormorant as the default, or ship a bolder sans as the add-on default?
- **Starters:** are four starter pages enough, or one per industry in the 12-site list?
- **Core API gaps:** should anything the kit exposes (display type scale, band shades) move into the core tokens instead?
