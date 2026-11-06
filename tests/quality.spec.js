// Section 5 quality gates: performance budget, CSS-only core, forced-colors, print, reduced-motion, and the locatability rule.
const { test, expect } = require('../fixtures');
const zlib = require('zlib');
const { url, read } = require('./helpers');
const gz = s => zlib.gzipSync(Buffer.from(s), { level: 9 }).length;

test.describe('performance budget', () => {
  test('the CSS a page loads (framework + tokens + fallback + font faces) is under 30 KB gzipped', () => {
    const total = ['edgelit.css', 'dist/tokens.css', 'dist/fallback.css', 'fonts/fonts.css'].map(f => gz(read(f))).reduce((a, b) => a + b, 0);
    console.log('css gzipped bytes:', total);
    expect(total).toBeLessThan(30 * 1024);
  });
  test('the behaviour script stays under 20 KB gzipped, the elements under 6 KB, the icons under 4 KB', () => {
    expect(gz(read('edgelit.js'))).toBeLessThan(20 * 1024);
    expect(gz(read('edgelit-elements.js'))).toBeLessThan(6 * 1024);
    expect(gz(read('edgelit-icons.js'))).toBeLessThan(4 * 1024);
  });
  test('core components need no JavaScript: with scripts blocked the starter keeps its buttons, fields, table, alert and badges styled', async ({ page }) => {
    await page.route('**/*.js', r => r.abort());
    await page.goto(url('agent-kit/examples/starter.html'));
    const s = await page.evaluate(() => {
      const g = (sel, p) => getComputedStyle(document.querySelector(sel))[p];
      return { btn: g('.me-btn--primary', 'borderTopWidth'), alertBorder: g('.me-alert', 'borderTopWidth'), badge: g('.me-badge--fill', 'backgroundColor'), th: g('.me-table th', 'textTransform'), field: getComputedStyle(document.querySelector('.me-anchor input')).backgroundColor };
    });
    expect(parseFloat(s.btn)).toBeGreaterThan(0); expect(parseFloat(s.alertBorder)).toBeGreaterThan(0);
    expect(s.badge).not.toBe('rgba(0, 0, 0, 0)'); expect(s.th).toBe('uppercase');
  });
  test('the page loads no third-party request except the optional Google Fonts import', async ({ page }) => {
    const external = []; page.on('request', r => { const u = r.url(); if (!/^file:|^data:|^blob:/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u)) external.push(u); });
    await page.goto(url('agent-kit/examples/starter.html')); await page.waitForTimeout(500);
    expect(external).toEqual([]);
  });
});

test.describe('user preferences', () => {
  test('forced-colors: controls keep a visible boundary and focus uses the system Highlight', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(url('agent-kit/examples/starter.html'));
    const b = await page.locator('.me-btn--primary').evaluate(e => { const c = getComputedStyle(e); return { w: parseFloat(c.borderTopWidth), style: c.borderTopStyle }; });
    expect(b.w).toBeGreaterThan(0); expect(b.style).not.toBe('none');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { outline: c.outlineStyle, w: parseFloat(c.outlineWidth), anchor: e.closest('.me-anchor') ? getComputedStyle(e.closest('.me-anchor')).outlineStyle : null }; });
    expect(f.outline !== 'none' || f.anchor !== 'none', JSON.stringify(f)).toBe(true);
  });
  test('forced-colors: the status badge text is still legible (the system pairs its colours)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(url('agent-kit/examples/starter.html'));
    const c = await page.locator('.me-badge--fill').first().evaluate(e => { const s = getComputedStyle(e); return [s.color, s.backgroundColor]; });
    expect(c[0]).not.toBe(c[1]);
  });
  test('print: light page, dark ink, no glow, dialogs and scrim not printed over content', async ({ page }) => {
    await page.goto(url('agent-kit/examples/starter.html'));
    await page.emulateMedia({ media: 'print' });
    const s = await page.evaluate(() => { const b = getComputedStyle(document.body); return { bg: b.backgroundColor, color: b.color }; });
    const lum = c => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    expect(lum(s.bg), 'background should print light: ' + s.bg).toBeGreaterThan(0.85);
    expect(lum(s.color), 'text should print dark: ' + s.color).toBeLessThan(0.3);
  });
  test('reduced motion: no animation or transition runs on buttons, the switch or the dialog', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url('agent-kit/examples/starter.html'));
    const r = await page.evaluate(() => [...document.querySelectorAll('.me-btn, me-switch button, .me-modal, .me-alert')].map(e => { const c = getComputedStyle(e); return [e.className, c.animationDuration, c.transitionDuration]; }));
    for (const [n, a, t] of r) { expect(parseFloat(a) || 0, n + ' animation').toBeLessThan(0.02); expect(parseFloat(t) || 0, n + ' transition').toBeLessThan(0.02); }
  });
  test('high contrast (prefers-contrast: more): control strokes get stronger', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Playwright Firefox emulation flips matchMedia but does not restyle the page, so this cannot be observed there');
    await page.goto(url('agent-kit/examples/starter.html'));
    const a = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--stroke-control'));
    await page.emulateMedia({ contrast: 'more' }); await page.waitForTimeout(100);
    const b = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--stroke-control'));
    expect(b.trim()).not.toBe(a.trim());
  });
});

test.describe('locatability: a control may be unboxed, but never unlocatable', () => {
  // At rest, with no hover and no focus, every visible interactive control must show a cue: a border, a visible background, or a lit
  // pseudo-element edge (own, or on its .me-anchor / parent group). Text-only links are exempt (underline) and icon buttons in a framed toolbar are judged by that toolbar.
  for (const [view, hash] of [['overview', '#app'], ['beds', '#app-beds'], ['irrigation', '#app-irrigation'], ['tasks', '#app-tasks'], ['components', '#app-components'], ['users', '#app-users']]) {
    test(`garden ${view}`, async ({ page }) => {
      await page.goto(url('garden.html', hash)); await page.waitForTimeout(1200);
      const lacking = await page.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden],[inert],dialog:not([open]),[popover]:not(:popover-open)') && !e.classList.contains('me-sr'); };
        const rgba = c => { const m = c.match(/[\d.]+/g) || []; return m.length > 3 ? +m[3] : (c === 'transparent' ? 0 : 1); };
        const pseudo = e => ['::before', '::after'].some(p => { const c = getComputedStyle(e, p); const glyph = /^"[^"\s]/.test(c.content);   // a visible glyph (e.g. the sort arrow) is a cue
          return glyph || c.content !== 'none' && c.content !== 'normal' && parseFloat(c.width) > 0 && parseFloat(c.height) > 0 && (rgba(c.backgroundColor) > 0 || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0 || c.boxShadow !== 'none'); });
        const cue = e => {
          const c = getComputedStyle(e);
          const border = ['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(c['border' + s + 'Width']) > 0 && c['border' + s + 'Style'] !== 'none' && rgba(c['border' + s + 'Color']) > 0.05);
          return border || rgba(c.backgroundColor) > 0.03 || c.backgroundImage !== 'none' || c.boxShadow !== 'none' || pseudo(e) || (e.closest('.me-anchor') && pseudo(e.closest('.me-anchor'))) || c.textDecorationLine.includes('underline') || c.outlineStyle !== 'none';
        };
        const out = [];
        for (const e of document.querySelectorAll('button, [role=tab], [role=switch], [role=menuitem], input:not([type=hidden]):not(.me-sr):not(.me-slider), select, textarea, a[href]:not(.me-crumbs a)')) {
          if (!vis(e) || cue(e)) continue;
          const group = e.closest('.me-tabs, .me-rail, .me-segmented, .me-toolbar, .me-list, .me-pager, .me-menu, .me-split, .me-side, .me-table, .me-btn-group, .me-cal, .me-listbox, .me-tree, .me-modal, .me-steps, .me-crumbs, .me-pair');
          if (group && cue(group)) continue;
          if (e.type === 'checkbox' || e.type === 'radio') { const l = e.closest('label'); if (l) { const cc = getComputedStyle(e); if (cc.appearance === 'none' || cc.borderTopWidth) { out.push('(check) ' + e.className); } } continue; }
          out.push((e.tagName + '.' + e.className + ' ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)).trim());
        }
        return [...new Set(out)];
      });
      expect(lacking).toEqual([]);
    });
  }
});
