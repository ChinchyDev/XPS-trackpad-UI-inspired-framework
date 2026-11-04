# Gap Review: Monolithic Edge-Lit v1.0 → v1.1

Method: read the spec and the SLM dashboard example, measured contrast, rebuilt the system as `monoedge.css`, and stress-tested it in `gallery.html` (dark and light, rendered in Edge).

## A. Defects in v1.0 (fixed in v1.1)

| # | Gap | Evidence | v1.1 fix |
|---|-----|----------|----------|
| 1 | **Muted text fails WCAG AA** | `#64748b` on dark panel = 3.9:1; "dim" `#475569` = 2.5:1; light dim `#94a3b8` = 2.6:1. All used at 10–12px. | Muted `#94a3b8` (7.3:1), dim `#7c8aa0` (5.3:1); light muted `#475569`, dim `#5b6b80`. |
| 2 | **Control outlines fail 3:1 non-text contrast** | Checkbox/switch border is 20% white. | New `--stroke-control` (32% dark / 45% light). `--stroke-divider` stays faint, because decorative lines are exempt. |
| 3 | **Spec and code disagree** | Spec uses `--mono-accent*`, `--mono-divider*`; code uses `--accent-*`, `--stroke-*`. `--xps-tick-idle` and `--amber-*` exist only in the example. Spec says inputs have no top/bottom borders, but the example adds a gradient fill and radius. | One token set in `monoedge.css`; the spec should now be generated from it. |
| 4 | **Colour hard-coded in components** | Split panel uses `rgba(99,102,241,…)` and amber literals, so it can't re-theme. | Everything derives from `--sig` with `color-mix`. Setting `data-signal="ok\|warn\|err\|info"` on any ancestor re-colours the whole subtree in both themes. |
| 5 | **Light-mode physics was only described, not implemented** | Spec: "inset etches" vs "halos". The example only swapped a few variables. | `--glow-strength` (1 dark / 0 light) scales every halo and adds the etch automatically. |
| 6 | **Wrapping grid draws wrong borders** | `.col{border-right}` leaves stray right borders when `auto-fit` wraps to one column. | `.me-grid` paints dividers with the `gap:1px` trick, so the borders stay correct at any width. |
| 7 | **Accessibility holes** | Switch is a `<div onclick>` with no keyboard, role or state. Tabs have no `role=tab`, `aria-selected` or arrow keys. Slider has `outline:none` and no focus fallback. Buttons and selects have no visible keyboard focus. | Switch is `<button role=switch aria-checked>`. Tabs are a roving-tabindex tablist. Global `:focus-visible` ring from spec 4.1. |
| 8 | **Disabled and error states never implemented** | The spec lists 6 states; the example shows 2. | Implemented and shown for every control. |
| 9 | **Error relies on colour alone** (WCAG 1.4.1) | Spec 4.1(6) says ticks "switch to Amber or Crimson". | Error also adds a `✕` message, an `aria-invalid` hook and a bottom hairline. Alerts carry a glyph per signal. |
| 10 | **Round things contradict "nothing round"** | The status beacon used `border-radius:50%`. | The beacon is a square (`.me-dot`). |
| 11 | **No Firefox slider** | Only `::-webkit-slider-*`. | `::-moz-range-*` added. The track also fills to the value. |
| 12 | **Touch targets** | 14px checkbox, 18px switch, with no coarse-pointer handling. | Choice rows grow to a 44px floor under `pointer: coarse`. Added a density token (`compact`, `default`, `roomy`). |
| 13 | **Spec's default font is wrong** | `--font-mono` is `-apple-system…` (a proportional font) with `monospace` as the last fallback. | `--font-ui` is a real monospace stack. Tabular numerals are available via `.me-num`. |

## B. Components missing from v1.0 (now added)
Buttons (default / primary / ghost / danger / pressed / busy / group / icon), textarea, select, prefix and suffix fields, number stepper, radio, indeterminate checkbox, segmented control, breadcrumbs, pagination, links, sortable and sticky-header table, stat tiles, badges, kbd, progress meter (determinate and indeterminate), skeleton, empty state, alerts, toasts, tooltip, dropdown menu, native `<dialog>` modal, accordion.

Visual language I chose for the new pieces, so they stay consistent:
- **Checkbox** is an L-shaped light (top and left).
- **Radio** is a single left bar.
- **Indeterminate** is a top bar only.
- **Row and menu hover** is a 2px left bar.
- **Selected segment, pager and tab** all use a top bar.

## C. Open decisions for you (not guessed)
1. **Elevation.** Modals and menus still use drop shadows, which is the most "floating card" thing left. Alternative: an edge-lit frame with no shadow, or a dimmed scrim only.
2. **Accent identity.** Indigo `#6366f1` is the single most common AI-generated-UI colour, and it works against your "tired of seeing the same UI" goal. Swapping `--accent` is one line. I'd try a phosphor green, amber or cyan.
3. **Icons.** There is no icon system yet. The geometry rules (1px strokes, square caps, no circles) need defining.
4. **Charts and data viz.** Not covered. They would need hairline axes, a light-bar series style and a palette that passes the contrast check.
5. **Typography.** All-monospace and all-caps labels read as "terminal". Decide whether that is the brand, or whether long-form text needs a proportional face.
6. **Motion budget.** Glows and scans animate constantly (beacon pulse, meter, busy button). A rule for "at most one ambient animation per view" would help.

## D. Known limits / not yet verified
- Only a static screenshot in Edge was checked. Keyboard behaviour (tab arrows, menu, modal, toast) and the open modal, menu and tooltip states are written but have not been exercised in a browser.
- `color-mix()` needs Chrome 111+, Safari 16.2+ or Firefox 113+. If you need older browsers, precompute the per-signal values.
- The Tailwind config in the spec is now stale against the new tokens. Regenerate it from `monoedge.css` rather than hand-editing.
- RTL, forced-colors and print have only minimal handling.
