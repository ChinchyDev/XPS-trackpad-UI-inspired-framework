// Colour maths shared by the token build and the accent helper: OKLCH <-> hex, WCAG contrast, the accessibility gate, and accent derivation.
const { parse, formatHex, converter, wcagContrast, clampChroma, differenceEuclidean } = require('culori');
const toOklch = converter('oklch');

const hexOf = c => formatHex(parse(c));
const oklchStr = c => { const o = toOklch(parse(c)); return `oklch(${o.l.toFixed(5)} ${(o.c || 0).toFixed(5)} ${(o.h ?? 0).toFixed(2)})`; };
/** Composite an rgba() / hex colour over an opaque background; returns an opaque hex. */
function over(fg, bg) {
  const f = parse(fg), b = parse(bg), a = f.alpha ?? 1;
  const mix = k => f[k] * a + b[k] * (1 - a);
  return formatHex({ mode: 'rgb', r: mix('r'), g: mix('g'), b: mix('b') });
}
const contrast = (a, b) => wcagContrast(a, b);

/** The gate. `t` is one resolved theme: { surfaces:{canvas,panel,surface,overlay}, text:{primary,muted,dim}, strokes:{...}, signals:{accent:{fill,text},...}, onFill }.
 *  Returns a list of failures (empty = pass). Thresholds: text 4.5:1, graphics / control edges 3:1 (WCAG 1.4.3, 1.4.11). */
function gate(name, t, opt = {}) {
  const fails = [], S = Object.entries(t.surfaces), min = { text: opt.text ?? 4.5, graphic: opt.graphic ?? 3 };
  const each = (label, fg, need, surfaces = S) => { for (const [sn, sv] of surfaces) { const r = contrast(fg, sv); if (r < need - 1e-9) fails.push(`${name}: ${label} on ${sn} (${sv}) = ${r.toFixed(2)}:1, needs ${need}:1`); } };
  for (const [k, v] of Object.entries(t.text)) each(`text ${k}`, v, min.text);
  for (const [k, sg] of Object.entries(t.signals)) {
    each(`${k} fill (light-bar, non-text)`, sg.fill, min.graphic);
    each(`${k} text`, sg.text, min.text);
    if (t.onFill) { const fillBg = t.filledBadgeBg?.(sg) ?? sg.fill; const r = contrast(t.onFill, fillBg); if (r < min.text) fails.push(`${name}: filled ${k} badge text ${t.onFill} on ${fillBg} = ${r.toFixed(2)}:1, needs ${min.text}:1`); }
  }
  for (const [k, v] of Object.entries(t.strokes)) for (const [sn, sv] of S) { const r = contrast(over(v, sv), sv); if (r < min.graphic - 1e-9 && /control|tick/.test(k)) fails.push(`${name}: ${k} on ${sn} = ${r.toFixed(2)}:1, needs ${min.graphic}:1`); }
  return fails;
}

/** Nudge a colour's OKLCH lightness (keeping hue and chroma) until it clears `need` against every background. Returns the original when it already passes. */
function adjust(color, backgrounds, need, direction) {
  const o = toOklch(parse(color)); const passes = c => backgrounds.every(bg => contrast(c, bg) >= need);
  let cur = hexOf(color); if (passes(cur)) return cur;
  for (let i = 1; i <= 400; i++) {
    const l = o.l + direction * i * 0.0025; if (l < 0 || l > 1) break;
    const c = formatHex(clampChroma({ mode: 'oklch', l, c: o.c, h: o.h }, 'oklch'));
    if (passes(c)) return c;
  }
  return null;
}

/** Derive a complete signal colour (fill + text) for both themes from ONE seed colour (any CSS colour). Hue and chroma are kept; lightness is moved the least that passes. */
function deriveSignal(seed, themes) {
  const o = toOklch(parse(seed)), out = {};
  for (const [name, t] of Object.entries(themes)) {
    const bgs = Object.values(t.surfaces), dark = t.mode === 'dark';
    const start = dark ? Math.max(o.l, 0.62) : Math.min(o.l, 0.58);
    const base = formatHex(clampChroma({ mode: 'oklch', l: start, c: o.c, h: o.h }, 'oklch'));
    const fill = adjust(base, bgs, 3.05, dark ? +1 : -1);
    const text = adjust(fill, bgs, 4.55, dark ? +1 : -1);
    out[name] = { fill, text };
  }
  return out;
}

module.exports = { hexOf, oklchStr, over, contrast, gate, adjust, deriveSignal, toOklch, parse, formatHex, differenceEuclidean };
