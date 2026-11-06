// 1C: the icon set. Spec: 16px grid, one lit segment, straight segments only (no circles, arcs or curves), sprite in its own file,
// icon-only buttons are named and big enough to hit.
const { test, expect } = require('../fixtures');
const fs = require('fs'); const path = require('path');
const { url, read, root } = require('./helpers');
const { build } = require('../scripts/build-icons');

const sprite = read('icons/sprite.svg');
const symbols = [...sprite.matchAll(/<symbol\s+id="([^"]+)"\s+viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)].map(m => ({ id: m[1], viewBox: m[2], body: m[3] }));
const app = (page, hash = '#app-components') => page.goto(url('garden.html', hash));

test.describe('sprite source', () => {
  test('there are at least 40 icons, with unique kebab-case ids', () => {
    expect(symbols.length).toBeGreaterThanOrEqual(40);
    const ids = symbols.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^i-[a-z]+(-[a-z]+)*$/);
  });
  test('every symbol is on the 16px grid', () => {
    for (const s of symbols) expect(s.viewBox, s.id).toBe('0 0 16 16');
  });
  test('no circles, ellipses, rounded rects, arcs or curves', () => {
    for (const s of symbols) {
      expect(s.body, s.id).not.toMatch(/<(circle|ellipse|polygon|line|rect|image)/);
      for (const d of [...s.body.matchAll(/\sd="([^"]+)"/g)].map(m => m[1])) expect(d, s.id).not.toMatch(/[AaCcSsQqTt]/);
    }
  });
  test('exactly one lit segment per icon, and it is the only styled path', () => {
    for (const s of symbols) {
      const paths = [...s.body.matchAll(/<path\b[^>]*>/g)].map(m => m[0]);
      expect(paths.filter(p => p.includes('--ico-l')).length, s.id).toBe(1);
      expect(paths.filter(p => /style=/.test(p) && !p.includes('stroke:var(--ico-l,currentColor)')).length, s.id).toBe(0);
    }
  });
  test('no hard-coded colours or stroke widths (they come from .me-ico)', () => {
    for (const s of symbols) { expect(s.body, s.id).not.toMatch(/#[0-9a-f]{3,6}|stroke-width|fill=|rgb\(/i); }
  });
  test('edgelit-icons.js is up to date with sprite.svg (run npm run build:icons)', () => {
    expect(fs.readFileSync(path.join(root, 'edgelit-icons.js'), 'utf8')).toBe(build());
  });
  test('garden.html no longer carries its own sprite', () => {
    expect(read('garden.html')).not.toContain('<symbol');
  });
});

test.describe('icons in the page', () => {
  test('the injected sprite has every symbol and every <use> resolves', async ({ page }) => {
    await app(page);
    const r = await page.evaluate(() => {
      const have = new Set([...document.querySelectorAll('#me-icons symbol')].map(s => s.id));
      const missing = [...document.querySelectorAll('use')].map(u => u.getAttribute('href').slice(1)).filter(id => !have.has(id));
      return { n: have.size, missing: [...new Set(missing)] };
    });
    expect(r.n).toBe(symbols.length);
    expect(r.missing).toEqual([]);
  });
  test('every icon draws something and stays inside its 16px box', async ({ page }) => {
    await app(page);
    const bad = await page.evaluate(() => {
      const out = [];
      for (const s of document.querySelectorAll('#me-icons symbol')) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 16 16');
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = s.innerHTML; svg.append(g); document.body.append(svg);
        const b = g.getBBox(); svg.remove();
        if (!(b.width + b.height > 0) || b.x < 1 || b.y < 1 || b.x + b.width > 15 || b.y + b.height > 15) out.push(s.id + ' ' + [b.x, b.y, b.width, b.height].join(','));
      }
      return out;
    });
    expect(bad).toEqual([]);
  });
  test('the gallery shows every icon', async ({ page }) => {
    await app(page);
    await expect(page.locator('#icon-grid .icon-cell')).toHaveCount(symbols.length);
    await expect(page.locator('#icon-grid .icon-cell').first().locator('span')).toHaveText('overview');
  });
  test('hovering an icon lights its segment (--ico-l becomes the signal colour)', async ({ page }) => {
    await app(page);
    const cell = page.locator('#icon-grid .icon-cell').nth(5);
    const read = () => cell.evaluate(e => getComputedStyle(e).getPropertyValue('--ico-l').trim());
    const rest = await read();
    await cell.hover();
    await expect.poll(read).not.toBe(rest);
  });
  test('size modifiers: sm 12, default 16, lg 20, xl 24', async ({ page }) => {
    await app(page);
    const sizes = await page.evaluate(() => ['sm', '', 'lg', 'xl'].map(k => { const e = document.querySelector(k ? `.me-ico--${k}` : '.me-side .me-ico'); return e.getBoundingClientRect().width; }));
    expect(sizes).toEqual([12, 16, 20, 24]);
  });
  test('JS-built UI uses the sprite: calendar trigger, month arrows, dialog close, pager', async ({ page }) => {
    await app(page, '#app-beds-modal-date');
    await expect(page.locator('#dlg-bed [data-close] use')).toHaveAttribute('href', '#i-close');
    await expect(page.locator('#nb-harv + button use')).toHaveAttribute('href', '#i-calendar');
    await expect(page.locator('.me-cal:popover-open .me-cal-nav use').first()).toHaveAttribute('href', '#i-chevron-left');
    await expect(page.locator('.me-cal:popover-open .me-cal-nav use').last()).toHaveAttribute('href', '#i-chevron-right');
  });
  test('ME.icon builds markup with the size class', async ({ page }) => {
    await app(page);
    expect(await page.evaluate(() => ME.icon('plus', 'lg'))).toContain('me-ico me-ico--lg');
  });
});

test.describe('icon-only buttons', () => {
  const sweep = page => page.evaluate(() => [...document.querySelectorAll('button, a')]
    .filter(e => e.children.length === 1 && e.firstElementChild.classList.contains('me-ico') && !e.textContent.trim())
    .map(e => { const r = e.getBoundingClientRect(); return { name: e.getAttribute('aria-label') || '', w: r.width, h: r.height, shown: !!e.offsetParent, id: e.id || e.className }; })
    .filter(x => x.shown));
  test('every icon-only button has an accessible name', async ({ page }) => {
    await app(page);
    const list = await sweep(page);
    expect(list.length).toBeGreaterThan(3);
    expect(list.filter(x => !x.name)).toEqual([]);
  });
  test('every icon-only button is at least 24 x 24 (WCAG 2.5.8)', async ({ page }) => {
    await app(page);
    for (const x of await sweep(page)) { expect(x.w, x.name).toBeGreaterThanOrEqual(24); expect(x.h, x.name).toBeGreaterThanOrEqual(24); }
  });
  test('the small icon button is still a full-size target', async ({ page }) => {
    await app(page);
    const b = await page.locator('button[aria-label="Add (small)"]').boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(28); expect(b.height).toBeGreaterThanOrEqual(28);
  });
  test('on touch every icon-only button is at least 44 x 44 @responsive', async ({ page }) => {
    await app(page);
    for (const x of await sweep(page)) { expect(x.w, x.name).toBeGreaterThanOrEqual(43.5); expect(x.h, x.name).toBeGreaterThanOrEqual(43.5); }
  });
});
