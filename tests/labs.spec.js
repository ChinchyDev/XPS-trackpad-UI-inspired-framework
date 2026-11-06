// Lab pages: icons.html (permanent sandbox for 1C). The scrollbar lab was deleted once B + C was chosen; the component is tested in scroll.spec.js.
const { test, expect } = require('../fixtures');
const AxeBuilder = require('@axe-core/playwright').default;
const { url } = require('./helpers');

const errors = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };

test.describe('icon lab', () => {
  const open = async (page, hash = '') => { const e = errors(page); await page.goto(url('icons.html', hash)); await page.waitForSelector('#ic-grid .ic-cell'); return e; };

  test('loads with no script errors and shows the whole set', async ({ page }) => {
    const e = await open(page);
    expect(e).toEqual([]);
    const n = await page.evaluate(() => document.querySelectorAll('#me-icons symbol').length);
    await expect(page.locator('#ic-grid .ic-cell')).toHaveCount(n);
    await expect(page.locator('#ladder svg')).toHaveCount(n * 4);
  });
  test('playground: typing an icon, size, colour, lit switch and stroke all update the preview', async ({ page }) => {
    await open(page);
    await page.fill('#pg-icon', 'leaf'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(page.locator('#zoom-svg use')).toHaveAttribute('href', '#i-leaf');
    await expect(page.locator('#snip')).toContainText("ME.icon('leaf')");
    await page.click('#seg-size [data-v=lg]');
    await expect(page.locator('#snip')).toContainText('me-ico--lg');
    await page.click('#seg-sig [data-v=warn]');
    await expect(page.locator('#zoom')).toHaveAttribute('data-signal', 'warn');
    await page.click('#sw-lit');
    expect(await page.locator('#zoom').evaluate(e => e.style.getPropertyValue('--ico-l'))).toBe('currentColor');
    await page.locator('#stroke').fill('2');
    await expect(page.locator('#stroke-o')).toHaveText('2.00');
    expect(await page.locator('#zoom-svg').evaluate(e => e.style.strokeWidth)).toMatch(/^2(px)?$/);
  });
  test('clicking an icon in the set selects it; the filter hides the rest', async ({ page }) => {
    await open(page);
    await page.click('.ic-cell[data-id=sun]');
    await expect(page.locator('#zoom-svg use')).toHaveAttribute('href', '#i-sun');
    await expect(page.locator('.ic-cell[data-id=sun]')).toHaveAttribute('aria-pressed', 'true');
    await page.fill('#set-q', 'chevron');
    await expect(page.locator('.ic-cell:not([hidden])')).toHaveCount(4);
  });
  test('the hit-area inspector finds icon-only controls and every one passes', async ({ page }) => {
    await open(page);
    const rows = await page.locator('#hit-t tbody tr').count();
    expect(rows).toBeGreaterThan(15);
    await expect(page.locator('#hit-sum')).toContainText('all pass');
    await expect(page.locator('#hit-sum')).toHaveAttribute('data-signal', 'ok');
  });
  test('adding a button from JS grows the toolbar and the inspector sees it', async ({ page }) => {
    await open(page);
    const before = await page.locator('#tb button').count();
    await page.click('#add-tb');
    await expect(page.locator('#tb button')).toHaveCount(before + 1);
    await expect(page.locator('#tb button').last()).toHaveAttribute('aria-label', 'Link');
    await expect(page.locator('#hit-t tbody')).toContainText('Link');
  });
  test('outlining hit areas labels each icon-only button with its size', async ({ page }) => {
    await open(page);
    await page.check('#show-hits');
    expect(await page.locator('button[aria-label=Add]').first().getAttribute('data-size')).toMatch(/^\d+(\.\d)?×\d+(\.\d)?$/);
  });
  test('contrast matrix is computed from the theme and updates when the theme flips', async ({ page }) => {
    await open(page);
    const dark = await page.locator('#con-t tbody tr').first().innerText();
    await page.click('#seg-theme [data-v=light]');
    const light = await page.locator('#con-t tbody tr').first().innerText();
    expect(dark).not.toBe(light);
    expect(light).not.toMatch(/NaN/);
    await expect(page.locator('#con-t tbody tr')).toHaveCount(8);
  });
  test('rest-state icon strokes (muted, primary, accent) are 3:1 on every surface in both themes', async ({ page }) => {
    await open(page);
    for (const theme of ['dark', 'light']) {
      await page.click(`#seg-theme [data-v=${theme}]`);
      const rows = await page.locator('#con-t tbody tr').evaluateAll(trs => trs.map(tr => ({ name: tr.cells[0].textContent.trim(), cells: [...tr.cells].slice(1).map(c => ({ t: c.textContent, bad: c.classList.contains('bad') })) })));
      for (const r of rows.filter(r => /muted|primary|accent/.test(r.name))) for (const c of r.cells) expect(c.bad, `${theme} ${r.name} ${c.t}`).toBe(false);
    }
  });
  test('toggle buttons flip aria-pressed; the password eye reveals and hides', async ({ page }) => {
    await open(page);
    const b = page.locator('#toggles button').first();
    await b.click(); await expect(b).toHaveAttribute('aria-pressed', 'true');
    await page.click('#f2e'); await expect(page.locator('#f2')).toHaveAttribute('type', 'text');
    await page.click('#f2e'); await expect(page.locator('#f2')).toHaveAttribute('type', 'password');
  });
  for (const theme of ['dark', 'light']) test(`axe: icon lab (${theme})`, async ({ page }) => {
    await open(page);
    if (theme === 'light') await page.click('#seg-theme [data-v=light]');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
  test('touch: every icon-only control is 44px @responsive', async ({ page }) => {
    await open(page);
    await expect(page.locator('#hit-sum')).toContainText('all pass');
    await expect(page.locator('#hit-env')).toContainText('coarse');
  });
});
