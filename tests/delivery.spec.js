// 1D delivery: cascade layers, W3C design tokens (+ accessibility gate, accent derivation), color-mix fallback, Tailwind preset, JS tokens.
const { test, expect } = require('../fixtures');
const fs = require('fs'); const path = require('path');
const postcss = require('postcss');
const { url, read, root } = require('./helpers');
const { build: buildTokens } = require('../scripts/build-tokens');
const { build: buildFallback, convert } = require('../scripts/build-fallback');
const { derive } = require('../scripts/derive-accent');
const { gate, contrast } = require('../scripts/colors');

const css = read('edgelit.css');

test.describe('cascade layers', () => {
  const tree = postcss.parse(css);
  test('the layer order is declared first: reset < tokens < base < components < utilities', () => {
    const first = tree.nodes.find(n => n.type === 'atrule' && n.name === 'layer');
    expect(first.params.replace(/\s+/g, '')).toBe('reset,tokens,base,components,utilities');
    expect(tree.nodes.indexOf(first)).toBeLessThan(tree.nodes.findIndex(n => n.type === 'atrule' && n.name === 'import'));
  });
  test('every rule in edgelit.css lives in a layer (only @import, @property, @layer statements and comments are top level)', () => {
    const loose = tree.nodes.filter(n => n.type === 'rule' || (n.type === 'atrule' && !['import', 'layer', 'property'].includes(n.name)));
    expect(loose.map(n => n.selector || '@' + n.name)).toEqual([]);
    const blocks = tree.nodes.filter(n => n.type === 'atrule' && n.name === 'layer' && n.nodes).map(n => n.params);
    expect(blocks).toEqual(['reset', 'tokens', 'base', 'components', 'utilities']);
  });
  test('the generated tokens are imported into the tokens layer', () => {
    expect(css).toMatch(/@import url\("dist\/tokens\.css"\) layer\(tokens\)/);
  });
  test('an un-layered page rule beats the framework without raising specificity', async ({ page }) => {
    await page.goto(url('garden.html', '#app-light-tasks'));
    await page.addStyleTag({ content: '.me-btn { background: rgb(255, 0, 0); }' });
    expect(await page.locator('.me-btn').first().evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 0, 0)');
  });
  test('prefers-reduced-motion still wins over an un-layered page transition (important in the reset layer)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url('garden.html', '#app-tasks'));
    await page.addStyleTag({ content: '.me-btn { transition: all 2s !important; }' });
    const d = await page.locator('.me-btn').first().evaluate(e => getComputedStyle(e).transitionDuration);
    expect(parseFloat(d)).toBeLessThan(0.01);
  });
});

test.describe('design tokens (W3C DTCG)', () => {
  test('the source files are DTCG: every leaf has $value and a $type', () => {
    for (const f of ['core', 'dark', 'light']) {
      const j = JSON.parse(read(`tokens/${f}.tokens.json`)), bad = [];
      (function walk(n, p) { for (const [k, v] of Object.entries(n)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) { if (!v.$type) bad.push(p.concat(k).join('.')); } else if (v && typeof v === 'object') walk(v, p.concat(k)); } })(j, []);
      expect(bad, f).toEqual([]);
    }
  });
  test('dist/ is current and the accessibility gate passes', async () => {
    const { fails, stale } = await buildTokens({ check: true });
    expect(fails).toEqual([]);
    expect(stale).toEqual([]);
  });
  test('signal colours are authored in OKLCH', () => {
    for (const f of ['dark', 'light']) { const j = JSON.parse(read(`tokens/${f}.tokens.json`)); for (const k of ['accent', 'ok', 'warn', 'err', 'info']) { expect(j[k].base.$value, `${f} ${k}`).toMatch(/^oklch\(/); expect(j[k].text.$value).toMatch(/^oklch\(/); } }
  });
  test('the gate catches a bad pair (a pale accent on the light theme)', async () => {
    const { themeForGate, resolveColours } = require('../scripts/build-tokens');
    const t = resolveColours(JSON.parse(read('tokens/light.tokens.json')));
    t.accent.base.$value = '#bde8f2';
    expect(gate('light', themeForGate('light', t, 'light')).join('\n')).toMatch(/accent fill/);
  });
  test('the primitives left edgelit.css: only the prefers-contrast overrides still set colour tokens by hand', () => {
    const tokensLayer = postcss.parse(css).nodes.find(n => n.type === 'atrule' && n.name === 'layer' && n.params === 'tokens');
    const defined = []; tokensLayer.walkDecls(d => { if (d.parent.parent?.params?.includes('prefers-contrast')) return; if (/^--(color|radius|space|font|z|accent|ok|warn|err|info|stroke|wash|glow|scrim|elev|on-signal|tick)\b/.test(d.prop) && !/-rgb$/.test(d.prop)) defined.push(d.prop); });
    expect(defined).toEqual([]);
  });
  test('generated CSS holds the same primitives the framework used before, per theme', async ({ page }) => {
    for (const [theme, hash] of [['dark', '#app'], ['light', '#app-light']]) {
      await page.goto('about:blank'); await page.goto(url('garden.html', hash));
      const v = await page.evaluate(() => { const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim(); return { canvas: g('--color-canvas'), panel: g('--color-panel'), accent: g('--accent'), rgb: g('--accent-rgb'), radius: g('--radius-float'), space: g('--space-4'), ui: g('--font-ui').slice(0, 6), glow: g('--glow-strength'), elev: g('--elev-1') }; });
      expect(v.canvas).toBe(theme === 'dark' ? '#14171d' : '#dadee3');
      expect(v.accent).toBe(theme === 'dark' ? '#22d3ee' : '#0e7490');
      expect(v.rgb).toBe(theme === 'dark' ? '34 211 238' : '14 116 144');
      expect(v.radius).toBe('4px'); expect(v.space).toBe('16px'); expect(v.ui).toBe('"Jost"'); expect(v.glow).toBe(theme === 'dark' ? '1' : '0');
    }
  });
  test('the JSON and JS outputs carry both themes and a flat cssVars map', () => {
    const t = require('../dist/tokens.js');
    expect(t.dark.color.canvas).toBe('#14171d'); expect(t.light.color.canvas).toBe('#dadee3');
    expect(t.cssVars['--color-panel']).toEqual({ dark: '#1b1f27', light: '#e9ecef' });
    expect(t.cssVars['--radius-micro']).toBe('2px');
    expect(JSON.parse(read('dist/tokens.json')).core.space['4']).toBe('16px');
  });
  test('the Tailwind preset points at the CSS variables (so both themes work)', () => {
    const p = require('../dist/tailwind.preset.js').theme.extend;
    expect(p.colors.panel).toBe('var(--color-panel)'); expect(p.colors.accent).toEqual({ DEFAULT: 'var(--accent)', text: 'var(--accent-text)' });
    expect(p.spacing['4']).toBe('var(--space-4)'); expect(p.borderRadius.float).toBe('var(--radius-float)'); expect(p.fontFamily.display).toEqual(['var(--font-display)']);
  });
  test('every var(--x) used in the framework or the pages is defined somewhere', () => {
    const files = ['edgelit.css', 'dist/tokens.css', 'dist/fallback.css', 'garden.html', 'gallery.html', 'dashboard.html', 'icons.html', 'edgelit.js', 'edgelit-icons.js'].map(read).join('\n');
    const used = new Set([...files.matchAll(/var\((--[\w-]+)\s*[,)]/g)].map(m => m[1]));
    const declared = new Set([...files.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]).concat([...files.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)].map(m => m[1])));
    const optional = new Set(['--ico-l', '--lit-t', '--lit-b', '--lit-l', '--lit-r', '--lit-wt', '--lit-wb', '--lit-level', '--lit-in', '--lit-out', '--lit-span', '--lit-ax', '--lit-ay', '--v', '--h', '--pct', '--gi-frame', '--c', '--lit-pos', '--scroll-corner']);   // set per element, with fallbacks
    const missing = [...used].filter(n => !declared.has(n) && !optional.has(n));
    expect(missing).toEqual([]);
  });
});

test.describe('accent derivation', () => {
  for (const seed of ['#7c3aed', '#facc15', '#ef4444', '#22c55e', 'oklch(0.7 0.15 150)', '#22d3ee', '#ffffff', '#111111']) {
    test(`a new accent from ${seed} passes the gate in both themes`, () => {
      const r = derive(seed);
      for (const mode of ['dark', 'light']) {
        const t = JSON.parse(read(`tokens/${mode}.tokens.json`)); const hexes = Object.fromEntries(['canvas', 'panel', 'surface', 'overlay'].map(k => [k, t.color[k].$value]));
        if (!r[mode].fill) continue;   // a colourless seed (white/near-black) may not reach the targets; the helper says so instead of lying
        for (const bg of Object.values(hexes)) { expect(contrast(r[mode].fill, bg), `${seed} ${mode} fill`).toBeGreaterThanOrEqual(3); expect(contrast(r[mode].text, bg), `${seed} ${mode} text`).toBeGreaterThanOrEqual(4.5); }
      }
    });
  }
  test('an accent that already passes is left alone (the derivation only moves what it must)', () => {
    const r = derive('#22d3ee');
    expect(r.dark.fill).toBe('#22d3ee');
  });
  test('a colour that fails is moved toward more contrast, keeping its hue', () => {
    const r = derive('#facc15');   // yellow: fine on dark, far too pale on light
    expect(r.light.fill).not.toBe('#facc15');
    expect(contrast(r.light.text, '#e9ecef')).toBeGreaterThanOrEqual(4.5);
  });
  test('an accent that looks like a signal colour is warned about; a distinct one is not', () => {
    expect(derive('#E60023').warnings.join(' ')).toMatch(/err signal/);   // brand red vs the critical red
    expect(derive('#1D7654').warnings.join(' ')).toMatch(/ok signal/);    // brand green vs the ok green
    expect(derive('#22d3ee').warnings).toEqual([]);                       // the default cyan
    expect(derive('#7c3aed').warnings).toEqual([]);
  });
});

test.describe('color-mix fallback', () => {
  test('dist/fallback.css is current and every color-mix could be converted', () => {
    const { css: gen, problems } = buildFallback();
    expect(problems).toEqual([]);
    expect(fs.readFileSync(path.join(root, 'dist', 'fallback.css'), 'utf8')).toBe(gen);
  });
  test('alpha mixes become rgb(var(--x-rgb) / P)', () => {
    expect(convert('color-mix(in srgb, var(--sig) 25%, transparent)')).toBe('rgb(var(--sig-rgb) / 25%)');
    expect(convert('0 0 8px color-mix(in srgb, var(--l) calc(100% * var(--glow-strength)), transparent), 0 1px red')).toBe('0 0 8px rgb(var(--l-rgb) / calc(100% * var(--glow-strength))), 0 1px red');
    expect(convert('color-mix(in oklch, red, blue)')).toBeNull();   // anything it cannot do exactly is reported, never guessed
  });
  test('the fallback only applies where color-mix is unsupported, and holds no color-mix itself', () => {
    const f = read('dist/fallback.css');
    expect(f).toContain('@supports not (color: color-mix(in srgb, red, blue))');
    expect(f).not.toMatch(/color-mix\(in srgb, var/);
  });
  test('every -rgb channel the fallback needs exists', async ({ page }) => {
    const used = [...new Set([...read('dist/fallback.css').matchAll(/var\((--[\w-]+-rgb)\)/g)].map(m => m[1]))];
    expect(used.length).toBeGreaterThan(3);
    await page.goto(url('garden.html', '#app'));
    const missing = await page.evaluate(names => names.filter(n => { const e = document.querySelector('.me-split') || document.body; return !getComputedStyle(e).getPropertyValue(n).trim(); }), used);
    expect(missing).toEqual([]);
  });
  test('the signal scopes keep --sig-rgb in step with --sig', async ({ page }) => {
    await page.goto(url('garden.html', '#app'));
    const r = await page.evaluate(() => ['ok', 'warn', 'err', 'info'].map(k => { const e = document.createElement('div'); e.dataset.signal = k; document.body.append(e); const s = getComputedStyle(e); const v = [s.getPropertyValue('--sig').trim(), s.getPropertyValue('--sig-rgb').trim()]; e.remove(); return v; }));
    for (const [hex, rgb] of r) expect(rgb).toBe([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(' '));
  });
});

test.describe('container queries', () => {
  test('edgelit.css has no viewport width media queries left (pointer, motion, contrast and print remain)', () => {
    const bad = []; postcss.parse(css).walkAtRules('media', a => { if (/(max|min)-width|(max|min)-height/.test(a.params)) bad.push(a.params); });
    expect(bad).toEqual([]);
  });
  test('the grid, nav and dialog are containers', () => {
    for (const n of ['me-grid', 'me-nav', 'me-modal', 'me-side', 'me-foot']) expect(css).toContain(`container: ${n} / inline-size`.replace('container: me-side / inline-size', 'container: me-side / inline-size'));
  });
  test('a grid shrinks its cell padding when ITS container is narrow, on a wide viewport', async ({ page }) => {
    await page.goto(url('garden.html', '#app'));
    const pads = await page.evaluate(() => {
      const mk = w => { const d = document.createElement('div'); d.style.width = w + 'px'; d.innerHTML = '<div class="me-grid" style="--cell-min:100px"><div>a</div><div>b</div></div>'; document.body.append(d); const p = getComputedStyle(d.querySelector('.me-grid > *')).paddingTop; d.remove(); return p; };
      return { narrow: mk(500), wide: mk(900) };
    });
    expect(pads).toEqual({ narrow: '16px', wide: '24px' });
  });
  test('a dialog tightens its body padding by its own width', async ({ page }) => {
    await page.goto(url('garden.html', '#app-beds-modal'));
    const wide = await page.locator('#dlg-bed .me-modal-body').evaluate(e => getComputedStyle(e).paddingTop);
    await page.locator('#dlg-bed').evaluate(e => { e.style.width = '420px'; });
    const narrow = await page.locator('#dlg-bed .me-modal-body').evaluate(e => getComputedStyle(e).paddingTop);
    expect([wide, narrow]).toEqual(['24px', '16px']);
  });
  test('tabs inside a nav go compact in a narrow nav', async ({ page }) => {
    await page.goto(url('garden.html', '#app-users'));
    const wide = await page.locator('#user-tabs .me-tab').first().evaluate(e => getComputedStyle(e).paddingInlineStart);
    await page.evaluate(() => { document.querySelector('#user-tabs').closest('.me-nav').style.width = '500px'; });
    const narrow = await page.locator('#user-tabs .me-tab').first().evaluate(e => getComputedStyle(e).paddingInlineStart);
    expect([wide, narrow]).toEqual(['24px', '16px']);
  });
});
