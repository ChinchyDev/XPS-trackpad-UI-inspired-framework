# EdgeLit

A UI framework where **light is structure**. Surfaces are flush and calm; state and boundaries are drawn as thin lines of light on the *edges* of things. No cards, no shadows, no rounded pills, no coloured icon packs. Dark and light themes, right-to-left support, and accessibility built in (WCAG 2.2 AA).

Plain CSS and JavaScript. No build step, no dependencies, no framework required. Open the examples straight from the folder.

## Try it in 30 seconds

1. Unzip this folder anywhere.
2. Open `examples/starter.html` in a browser (a small page that shows the basics).
3. Open `examples/garden.html` for the full demo app (sign in with `admin@plotline.io` / `garden`), and `examples/dashboard.html` for a dashboard.

## Use it in your own page

```html
<!doctype html>
<html lang="en" data-theme="dark">          <!-- "dark" or "light" -->
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="edgelit.css">
</head>
<body class="me">                              <!-- required: the scope class -->
  <script src="edgelit-icons.js"></script>   <!-- first thing in body -->

  <button class="me-btn me-btn--primary">Hello</button>

  <script src="edgelit.js"></script>           <!-- optional: charts, pickers, palette ... -->
  <script src="edgelit-elements.js"></script>  <!-- optional: <me-*> elements -->
</body>
</html>
```

Keep `dist/` and `icons/` next to `edgelit.css`: it loads its tokens from there.

## What is in the folder

| File | What it is |
|---|---|
| `edgelit.css` | The whole framework, in cascade layers |
| `edgelit.js` | Optional behaviour: charts, date picker, combobox, palette, upload, tree, toolbar, wizard, scrollbars |
| `edgelit-elements.js` | Optional custom elements: `<me-icon> <me-chart> <me-date> <me-combobox> <me-switch> <me-scroll>` |
| `edgelit-icons.js` | The 46-icon sprite (inline, works from `file://`) |
| `dist/` | Design tokens (CSS, JS) and a `color-mix()` fallback for older browsers |
| `tokens.json`, `tailwind.preset.js` | The same tokens as JSON, and a Tailwind preset |
| `examples/` | `starter.html`, `garden.html`, `dashboard.html` |
| `docs/USER-GUIDE.md` | How to build with it, step by step |
| `docs/HOW-IT-WORKS.md` | The ideas and the architecture |
| `DESIGN.md` | The full design specification (the rules, every token, every component). It is also written so you can hand it to an AI agent: *"Read DESIGN.md, then build X in the EdgeLit style."* |
| `NOTICE.md`, `LICENSE.txt` | Terms and font notice |

## Fonts need internet

EdgeLit uses **Jost** (interface) and **Cormorant Garamond** (titles and big numbers) from Google Fonts. They load automatically when you are online. This zip does not include the font files. Offline, the page falls back to Futura / Century Gothic / Segoe UI and Georgia: it still looks right, just less refined. (If you need fully offline fonts, download the two families from fonts.google.com and add `@font-face` rules; both are free under the SIL Open Font License.)

## Browsers

Current Chrome, Edge, Firefox and Safari (roughly 2023 and later). It uses cascade layers, container queries, `:has()`, the Popover API and `color-mix()` (with an automatic fallback). Tested on Chromium, Firefox and WebKit.

## Make it yours

Change the accent colour (default cyan) by setting four variables, in both themes:

```css
:root, [data-theme="dark"]  { --accent: #f59e0b; --accent-rgb: 245 158 11; --accent-text: #f59e0b; --accent-text-rgb: 245 158 11; }
[data-theme="light"]        { --accent: #b45309; --accent-rgb: 180 83 9;   --accent-text: #b45309; --accent-text-rgb: 180 83 9; }
```

Put that in your own stylesheet *after* `edgelit.css` (your CSS always wins over the framework's layers). Check that your text colour has 4.5:1 contrast against the panel colour.

Version 0.9.0.
