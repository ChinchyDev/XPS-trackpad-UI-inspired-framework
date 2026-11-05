// ME.scroll: the lit thumb (B) + edge lights (C) decision. Native scrolling stays; accent colour; thumb hidden at rest;
// edge lights lead on small scrollers and on touch.
const { test, expect } = require('../fixtures');
const AxeBuilder = require('@axe-core/playwright').default;
const { url } = require('./helpers');

const open = async (page, hash = '#app-components') => { await page.goto(url('garden.html', hash)); await page.waitForSelector('#sc-big'); await page.locator('#sc-l').scrollIntoViewIfNeeded(); };
const wrapOf = id => `.me-scroll:has(> #${id})`;
const setTop = (loc, y) => loc.evaluate((e, y) => { e.scrollTop = y; }, y);
const ACCENT = { dark: 'rgb(34, 211, 238)', light: 'rgb(14, 116, 144)' };

test.describe('structure', () => {
  test('a scroller is wrapped once, with a thumb track per axis, four edge lights and a corner', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big'));
    await expect(w).toHaveCount(1);
    await expect(w.locator('> .me-scroll-track')).toHaveCount(2);
    await expect(w.locator('> .me-scroll-edge')).toHaveCount(4);
    await expect(w.locator('> .me-scroll-corner')).toHaveCount(1);
    await expect(w.locator('> .me-scroll-track[aria-hidden=true]')).toHaveCount(2);
    expect(await page.evaluate(() => { ME.scroll(document.querySelector('#sc-big')); return document.querySelectorAll('.me-scroll:has(> #sc-big) .me-scroll-track').length; })).toBe(2);   // idempotent
  });
  test('native scrolling is untouched: the real scrollbar is hidden, scrolling and keyboard still work', async ({ page }) => {
    await open(page);
    const v = page.locator('#sc-big');
    expect(await v.evaluate(e => getComputedStyle(e).scrollbarWidth)).toBe('none');
    await v.focus(); await page.keyboard.press('PageDown');
    await expect.poll(() => v.evaluate(e => e.scrollTop)).toBeGreaterThan(100);
    await page.keyboard.press('End');
    await expect.poll(() => v.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 1)).toBe(true);
    const end = await v.evaluate(e => e.scrollTop);
    await v.hover(); await page.mouse.wheel(0, -2000);
    await expect.poll(() => v.evaluate(e => e.scrollTop)).toBeLessThan(end - 300);   // the wheel still scrolls (smooth scrolling may still be settling)
  });
  test('a scroller with nothing focusable inside becomes keyboard-reachable; ones with focusable content are left alone', async ({ page }) => {
    await open(page);
    await expect(page.locator('#sc-big')).toHaveAttribute('tabindex', '0');
    await page.goto('about:blank'); await page.goto(url('garden.html', '#app-beds'));
    await page.waitForSelector('#bed-t');
    expect(await page.locator('#bed-t').locator('xpath=..').getAttribute('data-me-tab')).toBeNull();   // rows are focusable already
  });
  test('table wraps and modal bodies in garden use it, and the page still works', async ({ page }) => {
    await page.goto(url('garden.html', '#app-beds'));
    await expect(page.locator('.me-scroll > .me-table-wrap').first()).toBeAttached();
    await page.click('#add-bed');
    await expect(page.locator('#dlg-bed .me-scroll > .me-modal-body')).toHaveCount(1);
    await page.fill('#nb-name', 'Scroll bed'); await page.click('#sp-bed [data-c=l]');
    await expect(page.locator('#toasts .me-alert')).toContainText('Scroll bed');
  });
});

test.describe('thumb (B): accent, hidden at rest, appears on hover and scroll, draggable', () => {
  test('hidden at rest, visible on hover, dims again after the pointer leaves', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big')), track = w.locator('> .me-scroll-track[data-axis=y]');
    await page.mouse.move(0, 0); await page.waitForTimeout(1300);
    await expect(track).toHaveCSS('opacity', '0');
    await w.hover();
    await expect.poll(async () => parseFloat(await track.evaluate(e => getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
    await page.mouse.move(0, 0);
    await expect.poll(async () => parseFloat(await track.evaluate(e => getComputedStyle(e).opacity)), { timeout: 4000 }).toBeLessThan(0.1);
  });
  test('scrolling wakes it (data-active) and it fades after about a second', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big'));
    await page.mouse.move(0, 0);
    await setTop(page.locator('#sc-big'), 300);
    await expect(w).toHaveAttribute('data-active', '');
    await expect(w).not.toHaveAttribute('data-active', '', { timeout: 3000 });
  });
  for (const theme of ['dark', 'light']) test(`is the accent colour, not a signal colour (${theme})`, async ({ page }) => {
    await open(page, theme === 'light' ? '#app-light-components' : '#app-components');
    const c = await page.locator(wrapOf('sc-big')).locator('.me-scroll-thumb').first().evaluate(e => getComputedStyle(e).backgroundColor);
    expect(c).toBe(ACCENT[theme]);
  });
  test('stays accent inside a warning context', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelector('#sc-big').closest('.me-scroll').setAttribute('data-signal', 'warn'));
    expect(await page.locator(wrapOf('sc-big')).locator('.me-scroll-thumb').first().evaluate(e => getComputedStyle(e).backgroundColor)).toBe(ACCENT.dark);
  });
  test('thumb length reflects the content and its position follows the scroll', async ({ page }) => {
    await open(page);
    const th = page.locator(wrapOf('sc-big')).locator('.me-scroll-thumb').first();
    const len0 = parseFloat(await th.evaluate(e => e.style.height)), top0 = parseFloat(await th.evaluate(e => e.style.top));
    expect(len0).toBeGreaterThan(28); expect(len0).toBeLessThan(200);
    await setTop(page.locator('#sc-big'), 600);
    await expect.poll(async () => parseFloat(await th.evaluate(e => e.style.top))).toBeGreaterThan(top0 + 30);
  });
  test('it swells and glows when grabbed', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big')); await w.hover();
    const th = w.locator('.me-scroll-thumb').first();
    const w0 = await th.evaluate(e => e.getBoundingClientRect().width);
    await th.hover();
    await expect.poll(() => th.evaluate(e => e.getBoundingClientRect().width)).toBeGreaterThan(w0 + 1.5);
  });
  test('dragging the thumb scrolls the content', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big')); await w.hover();
    const b = await w.locator('.me-scroll-thumb').first().boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 80, { steps: 8 }); await page.mouse.up();
    expect(await page.locator('#sc-big').evaluate(e => e.scrollTop)).toBeGreaterThan(80);
  });
  test('clicking the empty track pages in that direction', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big')); await w.hover();
    const t = await w.locator('> .me-scroll-track[data-axis=y]').boundingBox();
    await page.mouse.click(t.x + t.width / 2, t.y + t.height - 10);
    expect(await page.locator('#sc-big').evaluate(e => e.scrollTop)).toBeGreaterThan(150);
  });
  test('bars are hidden when everything fits and come back when content grows', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-small'));
    await page.evaluate(() => { const e = document.querySelector('#sc-small'); e.style.maxHeight = 'none'; e.style.height = '700px'; });
    await expect(w.locator('> .me-scroll-track[data-axis=y]')).toBeHidden();
    await page.evaluate(() => { document.querySelector('#sc-small').style.height = '170px'; });
    await expect(w.locator('> .me-scroll-track[data-axis=y]')).toBeAttached();
    await expect.poll(() => w.locator('> .me-scroll-track[data-axis=y]').evaluate(e => e.hidden)).toBe(false);
  });
  test('rows added later are picked up (the thumb shrinks)', async ({ page }) => {
    await open(page);
    const th = page.locator(wrapOf('sc-big')).locator('.me-scroll-thumb').first();
    const before = parseFloat(await th.evaluate(e => e.style.height));
    await page.evaluate(() => { const v = document.querySelector('#sc-big'); for (let i = 0; i < 80; i++) v.insertAdjacentHTML('beforeend', '<div class="task"><span>extra ' + i + '</span></div>'); });
    await expect.poll(async () => parseFloat(await th.evaluate(e => e.style.height))).toBeLessThan(before);
  });
  test('a wide table gets a horizontal bar, a vertical bar and a corner piece', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-wide'));
    await expect(w).toHaveAttribute('data-both', '');
    await expect(w.locator('> .me-scroll-track[data-axis=x]')).toBeAttached();
    await w.hover();
    await expect(w.locator('> .me-scroll-track[data-axis=x]')).toHaveCSS('opacity', '1');
    await page.locator('#sc-wide').evaluate(e => { e.scrollLeft = 200; });
    await expect.poll(async () => parseFloat(await w.locator('.me-scroll-track[data-axis=x] .me-scroll-thumb').evaluate(e => e.style.left))).toBeGreaterThan(20);
  });
});

test.describe('edge lights (C): lead on small scrollers, off on big ones (mouse)', () => {
  test('a small scroller lights its bottom edge, then both, then only the top', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-small')), v = page.locator('#sc-small');
    await expect(w).toHaveAttribute('data-more', 'bottom');
    await expect(w.locator('> [data-edge=bottom]')).toHaveCSS('opacity', '1');
    await expect(w.locator('> [data-edge=top]')).toHaveCSS('opacity', '0');
    await setTop(v, 40); await expect(w).toHaveAttribute('data-more', 'top bottom');
    await setTop(v, 99999); await expect(w).toHaveAttribute('data-more', 'top');
  });
  test('the content fades toward a lit edge', async ({ page }) => {
    await open(page);
    expect(await page.locator('#sc-small').evaluate(e => getComputedStyle(e).maskImage)).toContain('gradient');
  });
  test('a tall scroller has no edge lights with a mouse (the thumb is enough)', async ({ page }) => {
    await open(page);
    await expect(page.locator(wrapOf('sc-big'))).not.toHaveAttribute('data-more', /.*/);
    expect(await page.locator('#sc-big').evaluate(e => getComputedStyle(e).maskImage)).toBe('none');
  });
  test('the edge light is accent coloured', async ({ page }) => {
    await open(page);
    expect(await page.locator(wrapOf('sc-small')).locator('> [data-edge=bottom]').evaluate(e => getComputedStyle(e).backgroundColor)).toBe(ACCENT.dark);
  });
  test('a horizontal overflow lights the right edge, then the left', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-wide'));
    await expect(w).toHaveAttribute('data-more', /right/);
    await page.locator('#sc-wide').evaluate(e => { e.scrollLeft = 99999; });
    await expect(w).toHaveAttribute('data-more', /left/);
  });
  test('edges can be forced on or off with data-me-scroll', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { const d = document.createElement('div'); d.id = 'sc-forced'; d.style.cssText = 'height:500px;overflow:auto'; d.innerHTML = '<div style="height:2000px">tall</div>'; d.setAttribute('data-me-scroll', 'on'); document.querySelector('#sc-l').parentElement.append(d); ME.scroll(d, { edges: 'on' }); });
    await expect(page.locator(wrapOf('sc-forced'))).toHaveAttribute('data-more', 'bottom');
    await page.evaluate(() => { const d = document.createElement('div'); d.id = 'sc-off'; d.style.cssText = 'height:100px;overflow:auto'; d.innerHTML = '<div style="height:2000px">tall</div>'; document.querySelector('#sc-l').parentElement.append(d); ME.scroll(d, { edges: 'off' }); });
    await expect(page.locator(wrapOf('sc-off'))).not.toHaveAttribute('data-more', /.*/);
  });
});

test.describe('high contrast and motion', () => {
  test('forced colors gives the native scrollbar back and hides the custom pieces', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.locator('#sc-big').evaluate(e => getComputedStyle(e).scrollbarWidth)).toBe('auto');
    await expect(page.locator(wrapOf('sc-big')).locator('> .me-scroll-track[data-axis=y]')).toBeHidden();
  });
  test('reduced motion removes the thumb transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const d = await page.locator(wrapOf('sc-big')).locator('.me-scroll-thumb').first().evaluate(e => getComputedStyle(e).transitionDuration);
    expect(parseFloat(d)).toBeLessThan(0.01);
  });
});

test.describe('touch: edge lights lead, the thumb is only an indicator @responsive', () => {
  test('a tall list lights its bottom edge on a phone', async ({ page }) => {
    await open(page);
    await expect(page.locator(wrapOf('sc-big'))).toHaveAttribute('data-more', 'bottom');
    await expect(page.locator(wrapOf('sc-big')).locator('> [data-edge=bottom]')).toHaveCSS('opacity', '1');
  });
  test('the thumb is not shown on hover or focus, only while scrolling', async ({ page }) => {
    await open(page);
    const w = page.locator(wrapOf('sc-big')), track = w.locator('> .me-scroll-track[data-axis=y]');
    await page.waitForTimeout(1300);
    await expect(track).toHaveCSS('opacity', '0');
    await setTop(page.locator('#sc-big'), 200);
    await expect.poll(async () => parseFloat(await track.evaluate(e => getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
  });
  test('the thumb track is a 24px touch strip', async ({ page }) => {
    await open(page);
    const b = await page.locator(wrapOf('sc-big')).locator('> .me-scroll-track[data-axis=y]').boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(24);
  });
});

test.describe('a11y', () => {
  for (const [name, hash] of [['dark', '#app-components'], ['light', '#app-light-components']]) test(`axe: scrolling demos (${name})`, async ({ page }) => {
    await open(page, hash);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
