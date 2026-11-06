# EdgeLit user guide

For someone who wants to build pages with EdgeLit. About 15 minutes to read. (For the *why*, see `HOW-IT-WORKS.md`; for the complete rulebook and every token, see `DESIGN.md`.)

## 1. The look in one paragraph

Flat dark-charcoal (or soft-grey) surfaces. Nothing floats and nothing casts a shadow. Where a control is, and what state it is in, is shown by **light on its edges**: buttons light their top edge, fields get short vertical ticks at each side, tabs light the selected item's leading edge, alerts light their whole outline. More engagement means more light (rest, hover, pressed). Colour is rare: one accent (cyan) plus four meaning-carrying signal colours: red (critical), amber (warning), green (ok), sky-blue (notice).

## 2. Set up a page

See the snippet in `README.md`. Three things people forget:

1. `<body class="me">`: without it you get no base type, background, reduced-motion or print styles.
2. `<script src="edgelit-icons.js">` must be the *first* thing inside `<body>` if you use icons.
3. Keep the `dist/` and `icons/` folders next to `edgelit.css`.

Switch theme with `document.documentElement.dataset.theme = 'light' | 'dark'`. Switch direction with `dir="rtl"` on `<html>`. Switch density with `data-density="compact"` or `"roomy"` on any container.

## 3. Layout

| Class | Does |
|---|---|
| `.me-stack` | Vertical stack with a gap |
| `.me-row` | Horizontal row that wraps |
| `.me-grid` | Auto-fit grid; set `style="--cell-min:200px"` for the minimum cell width |
| `.me-panel` | A flat framed surface. Group related things in ONE panel |
| `.me-rule` | A hairline divider |

Pages adapt to the width of their *container* (not the screen), so a panel in a narrow column rearranges itself correctly.

## 4. The everyday components

```html
<!-- buttons: one primary per view -->
<button class="me-btn me-btn--primary">Save</button>
<button class="me-btn">Cancel</button>
<button class="me-btn me-btn--danger">Remove</button>

<!-- a field -->
<div class="me-field">
  <label class="me-label" for="n">Name</label>
  <div class="me-anchor"><input id="n"></div>
  <span class="me-hint">Shown under the field</span>
  <span class="me-error-msg">Shown when the field has data-signal="err"</span>
</div>

<!-- an alert (colour + a glyph: ✓ ! ✕ i) -->
<div class="me-alert" data-signal="warn" role="alert"><span class="me-glyph">!</span><div><div class="me-alert-title">Heads up</div>Details here.</div></div>

<!-- a status badge (only statuses get a fill) -->
<span class="me-badge me-badge--fill" data-signal="ok">Active</span>

<!-- a stat card -->
<div class="me-stat"><span class="me-label">Active</span><span class="me-stat-value">24</span><span class="me-delta me-dim">across 4 groups</span></div>

<!-- a table (always wrap it) -->
<div class="me-table-wrap" data-me-scroll>
  <table class="me-table"><thead><tr><th class="me-label" scope="col">Name</th></tr></thead><tbody><tr><td>North 1</td></tr></tbody></table>
</div>
```

Signal colours: put `data-signal="ok|warn|err|info"` on any element. Use `class="me-sig"` for text in the signal colour.

Also available: tabs, side navigation with collapse, breadcrumbs, pager, segmented control, switch, checkbox, radio, slider, meter, accordion, menu, tags, skeleton loaders, steps, and dialogs (`<dialog class="me-modal">`). `examples/garden.html` shows every one working; open it and read its source.

## 5. Dialogs

```html
<dialog class="me-modal me-lit" id="dlg" data-lit="t" aria-labelledby="h">
  <div class="me-modal-head"><span class="me-title" id="h">Add item</span></div>
  <div class="me-modal-body me-stack">...fields...</div>
  <div class="me-split" id="sp"><button data-c="l" aria-pressed="false">Save</button><button data-c="r" aria-pressed="false">Cancel</button></div>
</dialog>
<script>document.getElementById('dlg').showModal(); ME.split(document.getElementById('sp'));</script>
```

For a destructive confirmation use `data-signal="err" data-lit="t r l"` and put `autofocus` on the safe option.

## 6. Icons

```html
<svg class="me-ico" aria-hidden="true"><use href="#i-plus"/></svg>
<button class="me-btn me-btn--ghost me-btn--icon" aria-label="Close"><svg class="me-ico" aria-hidden="true"><use href="#i-close"/></svg></button>
```

Icon-only buttons must have an `aria-label`. Sizes: `me-ico--sm` / default / `--lg` / `--xl`. The list of names is in `DESIGN.md`. Or in JS: `ME.icon('plus', 'lg')`. Or in HTML: `<me-icon name="plus" size="lg">`.

## 7. The JavaScript helpers (all optional)

```js
ME.chart(host, [3,5,4,7], { labels:['M','T','W','T'], unit:' L', axis:true, table:true })   // line / area / step / sparkline
ME.datepicker(input, { time:true, min:'2026-01-01' })
ME.combobox(input, { options:['Tomato','Kale'], multi:true, custom:true })
ME.palette(dialog, { items: () => [{ label:'Go to Beds', group:'Navigate', run(){ ... } }] })   // command palette dialog (open it on Ctrl/Cmd+K)
ME.upload(root)    ME.tree(root, nodes)    ME.toolbar(el)    ME.wizard(root)
ME.scroll(el)      // or just add data-me-scroll to any scroller
```

The same widgets exist as HTML elements, which is the easiest way to use them in a form:

```html
<me-date label="Due date" name="due"></me-date>
<me-combobox label="Crop" name="crop" options='["Tomato","Kale"]' multi></me-combobox>
<me-switch label="Notify me" name="notify" checked></me-switch>
<me-chart values="[3,5,4,7]" labels='["M","T","W","T"]' axis table label="Visits"></me-chart>
```

They contain real inputs, so ordinary `<form>` submission and screen readers just work.

## 8. Using it with Tailwind, React, Vue

- **Tailwind:** `tailwind.preset.js` exposes the colours, spacing and radii as theme values. Add it under `presets` in your Tailwind config.
- **React / Vue / Svelte:** write the same markup. Use the `<me-*>` elements for the interactive widgets (React 19 passes props through to custom elements; with older React set properties through a ref), or call `ME.*` in an effect.

## 9. Rules to keep it looking right

1. No pure black or white backgrounds: use the surface tokens.
2. No box-shadow, no gradients on surfaces.
3. Radius 0 to 4px. Never a circle (no round avatars, no pill buttons).
4. Only the accent and the four signal colours. No other hues.
5. Only a status gets a filled badge; everything else is plain text.
6. Every control is locatable at rest: it shows at least one edge cue.
7. State is never colour alone: pair it with a glyph or a word.
8. One primary button per view.

The complete list (16 rules with reasons) and a pre-flight checklist are in `DESIGN.md`.

## 10. Troubleshooting

| Problem | Cause and fix |
|---|---|
| Page looks unstyled or tiny | Missing `<body class="me">`, or `dist/` is not next to `edgelit.css` |
| Icons missing | `edgelit-icons.js` is not the first child of `<body>`, or it did not load |
| My CSS does not override | Put it in a normal `<style>` or stylesheet; un-layered CSS always wins. Do not use `!important` |
| Fonts look different offline | Fonts load from Google Fonts; offline uses system fonts |
| A popover (calendar, suggestions) looks wrong | Use `ME.datepicker` / `ME.combobox` (or the `<me-*>` elements) rather than hand-rolling: they mount in the browser's top layer and inside open dialogs automatically |
| Right-to-left looks wrong | Use logical CSS in your own styles (`margin-inline-start`, `text-align: start`), never `left` / `right` |
