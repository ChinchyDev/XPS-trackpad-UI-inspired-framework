// Right-to-left: logical properties mirror the layout, --dir mirrors shadows / translations / gradients, keyboard arrows follow the reading direction.
const { test, expect } = require('../fixtures');
const AxeBuilder = require('@axe-core/playwright').default;
const { url, read } = require('./helpers');
const postcss = require('postcss');

const rtl = (page, hash = '#app') => page.goto(url('garden.html', hash.includes('rtl') ? hash : hash + '-rtl'));

test.describe('source', () => {
  const tree = postcss.parse(read('edgelit.css'));
  const PHYSICAL = /^(margin|padding)-(left|right)$|^border-(left|right)(-(width|color|style))?$|^(left|right)$/;
  test('edgelit.css uses logical properties (physical left/right only where it is keyed to a physical side)', () => {
    const bad = [];
    tree.walkDecls(d => {
      if (!PHYSICAL.test(d.prop)) return;
      const rule = d.parent, centred = rule.nodes.some(n => n.type === 'decl' && n.prop === 'transform' && /translate(X)?\(\s*-50%/.test(n.value));
      const edge = /data-edge="(left|right)"/.test(rule.selector || '');   // scroll edge lights are keyed to physical sides by the JS tokens
      if (!centred && !edge) bad.push(`${rule.selector} { ${d.prop} }`);
    });
    expect(bad).toEqual([]);
  });
  test('no left-aligned or right-aligned text; use start / end', () => {
    const bad = []; tree.walkDecls('text-align', d => { if (/^(left|right)$/.test(d.value)) bad.push(d.parent.selector); });
    expect(bad).toEqual([]);
  });
  test('no 4-value border-radius that would not mirror', () => {
    const bad = []; tree.walkDecls('border-radius', d => { const p = d.value.trim().split(/\s+(?![^(]*\))/); if (p.length === 4 && !p.every(x => x === p[0])) bad.push(d.parent.selector); });
    expect(bad).toEqual([]);
  });
  test('--dir is 1 in LTR and -1 in RTL', async ({ page }) => {
    await page.goto(url('garden.html', '#app'));
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dir').trim())).toBe('1');
    await rtl(page); await page.reload();
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dir').trim())).toBe('-1');
  });
});

test.describe('layout mirrors', () => {
  test('the side bar moves to the right and the content to the left', async ({ page }) => {
    await rtl(page);
    const side = await page.locator('#side').boundingBox(), main = await page.locator('.main').boundingBox();
    expect(side.x).toBeGreaterThan(main.x);
  });
  test('text aligns to the start (the right) and numbers in a table column to the end (the left)', async ({ page }) => {
    await rtl(page, '#app-beds');
    const edge = sel => page.locator(sel).first().evaluate(td => { const r = document.createRange(); r.selectNodeContents(td); const t = r.getBoundingClientRect(), c = td.getBoundingClientRect(); return { fromLeft: t.left - c.left, fromRight: c.right - t.right }; });
    const name = await edge('#bed-t tbody td:first-child'), num = await edge('#bed-t tbody td.num');
    expect(name.fromRight).toBeLessThan(name.fromLeft);   // hugging the right edge
    expect(num.fromLeft).toBeLessThan(num.fromRight);     // hugging the left edge
  });
  test('a dialog title sits on the right and its close button on the left', async ({ page }) => {
    await rtl(page, '#app-beds-modal');
    const t = await page.locator('#bed-h').boundingBox(), c = await page.locator('#dlg-bed [data-close]').boundingBox();
    expect(t.x).toBeGreaterThan(c.x);
  });
  test('the selected rail item lights its leading edge on the right', async ({ page }) => {
    await rtl(page);
    const pos = await page.locator('.me-rail').first().locator('[aria-current=page]').evaluate(e => getComputedStyle(e, '::before').backgroundPositionX);
    expect(pos).toContain('100%');   // LTR: 0%
    await page.goto('about:blank'); await page.goto(url('garden.html', '#app'));
    expect(await page.locator('.me-rail').first().locator('[aria-current=page]').evaluate(e => getComputedStyle(e, '::before').backgroundPositionX)).toContain('0%');
  });
  test('the switch thumb travels toward the start when on, and the on state leaves its trail behind', async ({ page }) => {
    await rtl(page, '#app-irrigation');
    const sw = page.locator('.me-switch').nth(2); await expect(sw).toHaveAttribute('aria-checked', 'false');   // the Tunnel zone starts off
    const off = await sw.evaluate(e => ({ track: e.getBoundingClientRect(), t: getComputedStyle(e, '::after').transform }));
    await sw.click(); await page.waitForTimeout(400);
    const on = await sw.evaluate(e => getComputedStyle(e, '::after').transform);
    // translateX(26px) in LTR, translateX(-26px) in RTL: the thumb moves toward the LEFT here
    const x = s => parseFloat(s.replace(/matrix\(([^)]*)\)/, '$1').split(',')[4] || 0);
    expect(Math.abs(x(on) - x(off.t))).toBeCloseTo(26, 0);
    expect(x(on) - x(off.t)).toBeLessThan(0);
  });
  test('charts keep a left-to-right time axis', async ({ page }) => {
    await rtl(page, '#app-telemetry');
    expect(await page.locator('#ch-water').evaluate(e => getComputedStyle(e).direction)).toBe('ltr');
    const x = await page.locator('#ch-water .me-chart-x span').evaluateAll(a => a.map(e => e.getBoundingClientRect().x));
    expect([...x].sort((a, b) => a - b)).toEqual(x);
  });
  test('directional glyphs mirror: pager chevrons and the collapse icon', async ({ page }) => {
    await rtl(page, '#app-beds');
    const t = await page.locator('#bed-pager [data-flip]').first().evaluate(e => getComputedStyle(e).transform);
    expect(t).toMatch(/^matrix\(-1/);
    expect(await page.locator('[data-collapse] .me-ico').evaluate(e => getComputedStyle(e).transform)).toMatch(/^matrix\(-1/);
    await page.click('[data-collapse]'); await page.waitForTimeout(400);
    expect(await page.locator('[data-collapse] .me-ico').evaluate(e => getComputedStyle(e).transform)).toBe('none');
  });
});

test.describe('components in RTL', () => {
  test('the scroller reports hidden content on the correct physical side', async ({ page }) => {
    await rtl(page, '#app-components');
    const w = page.locator('.me-scroll:has(> #sc-wide)');
    await expect(w).toHaveAttribute('data-more', /left/);        // at the start (right-most): the rest is to the LEFT
    await expect(w).not.toHaveAttribute('data-more', /right/);
    await page.locator('#sc-wide').evaluate(e => { e.scrollLeft = -99999; });
    await expect(w).toHaveAttribute('data-more', /right/);
    await expect(w).not.toHaveAttribute('data-more', /left/);
  });
  test('the scroller thumb starts at the right and moves left', async ({ page }) => {
    await rtl(page, '#app-components');
    const th = page.locator('.me-scroll:has(> #sc-wide) .me-scroll-track[data-axis=x] .me-scroll-thumb');
    const x0 = parseFloat(await th.evaluate(e => e.style.left));
    await page.locator('#sc-wide').evaluate(e => { e.scrollLeft = -200; });
    await expect.poll(async () => parseFloat(await th.evaluate(e => e.style.left))).toBeLessThan(x0 - 20);
  });
  test('the date picker: Monday column on the right, and ArrowLeft moves to the NEXT day', async ({ page }) => {
    await rtl(page, '#app-beds-modal');
    await page.click('#nb-harv + button');
    const ths = await page.locator('.me-cal:popover-open th').evaluateAll(a => a.map(e => e.getBoundingClientRect().x));
    expect(ths[0]).toBeGreaterThan(ths[6]);
    const d0 = await page.evaluate(() => document.activeElement.dataset.date);
    await page.keyboard.press('ArrowLeft');
    const d1 = await page.evaluate(() => document.activeElement.dataset.date);
    expect(new Date(d1) - new Date(d0)).toBe(864e5);
  });
  test('the toolbar: ArrowLeft goes to the next button', async ({ page }) => {
    await rtl(page, '#app-components');
    const b = page.locator('#c-tb button');
    await b.first().focus(); await page.keyboard.press('ArrowLeft');
    await expect(b.nth(1)).toBeFocused();
  });
  test('the tree: ArrowLeft expands, ArrowRight collapses', async ({ page }) => {
    await rtl(page, '#app-components');
    const south = page.locator('#c-tree > [role=treeitem]').nth(1);
    await south.focus(); await page.keyboard.press('ArrowLeft');
    await expect(south).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(south).toHaveAttribute('aria-expanded', 'false');
  });
  test('tabs: ArrowLeft selects the next tab', async ({ page }) => {
    await rtl(page, '#app-components');
    await page.locator('#ct-0').focus(); await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#ct-1')).toHaveAttribute('aria-selected', 'true');
  });
  test('LTR is unchanged: ArrowRight still goes to the next tab', async ({ page }) => {
    await page.goto(url('garden.html', '#app-components'));
    await page.locator('#ct-0').focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#ct-1')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('RTL a11y', () => {
  for (const hash of ['#app-rtl', '#app-components-rtl', '#app-beds-modal-rtl']) test(`axe ${hash}`, async ({ page }) => {
    await page.goto(url('garden.html', hash)); await page.waitForTimeout(1500);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
