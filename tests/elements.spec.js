// edgelit-elements.js: custom elements over edgelit.js (light DOM, form-friendly, attribute + property driven).
const { test, expect } = require('../fixtures');
const { url, read, settled } = require('./helpers');

const open = async (page, hash = '#app-components') => { const e = []; page.on('pageerror', x => e.push(x.message)); await page.goto(url('garden.html', hash)); await page.waitForSelector('me-chart svg'); return e; };
const form = page => page.evaluate(() => { const o = {}; for (const [k, v] of new FormData(document.querySelector('#wc-form')).entries()) o[k] = o[k] ? [].concat(o[k], v) : v; return o; });

test.describe('registration', () => {
  test('all six elements are defined and the page has no script errors', async ({ page }) => {
    const errs = await open(page);
    expect(errs).toEqual([]);
    const names = await page.evaluate(() => ME.elements.map(n => [n, !!customElements.get(n)]));
    expect(names.length).toBe(6);
    for (const [n, ok] of names) expect(ok, n).toBe(true);
  });
  test('it needs edgelit.js first and says so', () => {
    expect(read('edgelit-elements.js')).toMatch(/needs edgelit\.js first/);
  });
});

test.describe('<me-icon>', () => {
  test('draws the sprite icon, with size and flip', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<me-icon id="i1" name="plus" size="xl" flip></me-icon>'));
    const i = page.locator('#i1');
    await expect(i.locator('use')).toHaveAttribute('href', '#i-plus');
    expect(await i.locator('svg').evaluate(e => e.getBoundingClientRect().width)).toBe(24);
    await expect(i.locator('svg')).toHaveAttribute('data-flip', '');
    await expect(i.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  test('re-renders when an attribute changes; a label makes it meaningful', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<me-icon id="i2" name="plus"></me-icon>'));
    await page.evaluate(() => { const e = document.querySelector('#i2'); e.setAttribute('name', 'trash'); e.setAttribute('label', 'Delete'); });
    const i = page.locator('#i2');
    await expect(i.locator('use')).toHaveAttribute('href', '#i-trash');
    await expect(i.locator('svg')).toHaveAttribute('role', 'img');
    await expect(i.locator('svg')).toHaveAttribute('aria-label', 'Delete');
    await expect(i.locator('svg')).not.toHaveAttribute('aria-hidden', /.*/);
  });
});

test.describe('<me-chart>', () => {
  test('values / labels / unit / axis / table attributes draw the chart', async ({ page }) => {
    await open(page);
    const c = page.locator('#wc-chart');
    await expect(c.locator('path.line')).toHaveCount(1);
    await expect(c.locator('rect.hit')).toHaveCount(6);
    await expect(c.locator('.me-chart-y span').first()).toBeVisible();
    await expect(c.locator('table.me-sr caption')).toHaveText('Visits per day');
    await expect(c).toHaveAttribute('role', 'group');
    expect(await c.locator('rect.hit').last().locator('title').textContent()).toContain('9 visits');
  });
  test('changing the values attribute re-renders; the .series property takes several lines', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelector('#wc-chart').setAttribute('values', '[1,2,3]'));
    await expect(page.locator('#wc-chart rect.hit')).toHaveCount(3);
    await page.evaluate(() => { const c = document.querySelector('#wc-chart'); c.removeAttribute('labels'); c.series = [{ name: 'Now', data: [1, 2, 3] }, { name: 'Before', data: [2, 2, 2], alt: true }]; });
    await expect(page.locator('#wc-chart path.line')).toHaveCount(2);
    await expect(page.locator('#wc-chart .me-legend li')).toHaveCount(2);
  });
  test('spark draws no axes; an empty series shows the empty message; a label names a chart without a table', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<me-chart id="c2" spark values="[1,3,2,4]" label="Trend, rising"></me-chart><me-chart id="c3" values="[]" empty="Nothing yet"></me-chart>'));
    await expect(page.locator('#c2')).toHaveClass(/me-spark/);
    await expect(page.locator('#c2')).toHaveAttribute('role', 'img');
    await expect(page.locator('#c2')).toHaveAttribute('aria-label', 'Trend, rising');
    await expect(page.locator('#c3 .me-empty')).toContainText('Nothing yet');
  });
  test('a signal colours it (data-signal passes straight through)', async ({ page }) => {
    await open(page);
    const c = await page.locator('#wc-chart path.line').evaluate(e => getComputedStyle(e).stroke);
    expect(c).toBe('rgb(96, 165, 250)');   // --info, dark
  });
});

test.describe('<me-scroll>', () => {
  test('wraps itself with the lit thumb and edge lights, once', async ({ page }) => {
    await open(page);
    const w = page.locator('.me-scroll:has(> me-scroll#wc-scroll)');
    await expect(w).toHaveCount(1);
    await expect(w.locator('> .me-scroll-track')).toHaveCount(2);
    await expect(w).toHaveAttribute('data-more', 'bottom');   // 110px is a small scroller: edge lights lead
    expect(await page.locator('#wc-scroll').evaluate(e => getComputedStyle(e).overflowY)).toBe('auto');
  });
});

test.describe('<me-date>', () => {
  test('renders a labelled, hinted field with a calendar trigger', async ({ page }) => {
    await open(page);
    const d = page.locator('#wc-date');
    await expect(d.locator('label')).toHaveText('Due date');
    await expect(d.locator('input')).toHaveAttribute('name', 'due');
    await expect(d.locator('input')).toHaveAttribute('aria-describedby', /.+/);
    await expect(d.locator('button[aria-label="Choose date"]')).toBeVisible();
  });
  test('picking a day sets the value, fires change on the host and goes into the form', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { window.__ch = 0; document.querySelector('#wc-date').addEventListener('change', () => window.__ch++); });
    await page.click('#wc-date button[aria-label="Choose date"]');
    await page.locator('.me-cal:popover-open .me-cal-day:not([disabled]):not([data-out])').nth(14).click();
    expect(await page.evaluate(() => window.__ch)).toBeGreaterThan(0);
    const v = await page.locator('#wc-date input').inputValue();
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((await form(page)).due).toBe(v);
    expect(await page.evaluate(() => document.querySelector('#wc-date').value)).toBe(v);
  });
  test('min / time / value attributes and the value property', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelector('#wc-form').insertAdjacentHTML('beforeend', '<me-date id="d2" label="Start" name="start" time value="2026-11-20 14:30" min="2026-11-15"></me-date>'));
    await expect(page.locator('#d2 input')).toHaveValue('2026-11-20 14:30');
    await page.click('#d2 button[aria-label="Choose date"]');
    await expect(page.locator('.me-cal:popover-open select[aria-label=Hour]')).toBeVisible();
    await expect(page.locator('.me-cal:popover-open .me-cal-day[data-date="2026-11-10"]')).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.querySelector('#d2').value = '2026-12-01 09:00'; });
    await expect(page.locator('#d2 input')).toHaveValue('2026-12-01 09:00');
  });
});

test.describe('<me-combobox>', () => {
  test('multi: starts with its value, adds from the list, and every value goes into the form', async ({ page }) => {
    await open(page);
    const c = page.locator('#wc-combo');
    await expect(c.locator('.me-tag')).toHaveCount(1);
    const t = c.locator('input[role=combobox]'); await t.click(); await t.fill('bea'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(c.locator('.me-tag')).toHaveCount(2);
    expect((await form(page)).crops).toEqual(['Kale', 'Beans']);
    expect(await page.evaluate(() => document.querySelector('#wc-combo').value)).toEqual(['Kale', 'Beans']);
  });
  test('custom values are allowed, and it announces change on the host', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { window.__c = 0; document.querySelector('#wc-combo').addEventListener('change', () => window.__c++); });
    const i = page.locator('#wc-combo input[role=combobox]'); await i.fill('Leek'); await i.press('Enter');
    await expect(page.locator('#wc-combo .me-tag')).toHaveCount(2);
    expect(await page.evaluate(() => window.__c)).toBeGreaterThan(0);
    expect((await form(page)).crops).toContain('Leek');
  });
  test('the options property replaces the list; a single combobox puts its text in the form', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelector('#wc-form').insertAdjacentHTML('beforeend', '<me-combobox id="c2" name="zone" label="Zone"></me-combobox>'));
    await page.evaluate(() => { document.querySelector('#c2').options = ['North', 'South']; });
    const i = page.locator('#c2 input'); await i.click();
    await expect(page.locator('.me-option')).toHaveCount(2);
    await i.press('Enter');   // opening by click activates the first option
    expect((await form(page)).zone).toBe('North');
  });
});

test.describe('<me-switch>', () => {
  test('toggles, fires change, and only submits when on', async ({ page }) => {
    await open(page);
    const sw = page.locator('#wc-sw button');
    await expect(sw).toHaveAttribute('role', 'switch'); await expect(sw).toHaveAttribute('aria-checked', 'true');
    expect((await form(page)).auto).toBe('on');
    await page.evaluate(() => { window.__s = 0; document.querySelector('#wc-sw').addEventListener('change', () => window.__s++); });
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => window.__s)).toBe(1);
    expect((await form(page)).auto).toBeUndefined();
    expect(await page.evaluate(() => document.querySelector('#wc-sw').checked)).toBe(false);
  });
  test('is named by its label and the checked property drives it', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('switch', { name: 'Auto mode' })).toBeVisible();
    await page.evaluate(() => { document.querySelector('#wc-sw').checked = false; });
    await expect(page.locator('#wc-sw button')).toHaveAttribute('aria-checked', 'false');
  });
  test('works through the form read-out', async ({ page }) => {
    await open(page);
    await page.click('#wc-submit');
    const out = JSON.parse(await page.locator('#wc-out').textContent());
    expect(out.auto).toBe('on'); expect(out.crops).toBe('Kale');
  });
});

test.describe('elements are accessible in both themes', () => {
  const AxeBuilder = require('@axe-core/playwright').default;
  for (const [name, hash] of [['dark', '#app-components'], ['light', '#app-light-components']]) test(`axe ${name}`, async ({ page }) => {
    await open(page, hash); await settled(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
