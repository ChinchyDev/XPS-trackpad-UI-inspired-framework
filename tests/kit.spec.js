// agent-kit/: the folder you point an agent at. It must be current, self-contained, truthful, and its starter page must obey the rules it teaches.
const { test, expect } = require('../fixtures');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const { read, url } = require('./helpers');
const kit = f => fs.readFileSync(path.join(__dirname, '..', 'agent-kit', f), 'utf8');

test.describe('kit contents', () => {
  test('agent-kit is current (npm run build:kit)', () => {
    expect(() => execSync('node scripts/build-kit.js --check', { cwd: path.join(__dirname, '..'), stdio: 'pipe' })).not.toThrow();
  });
  test('it is self-contained: every file monoedge.css and the starter reference exists inside the kit', () => {
    const css = kit('monoedge.css'), html = kit('examples/starter.html');
    const refs = [...css.matchAll(/@import url\("([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u)).map(u => u.split('?')[0]);
    for (const r of refs) expect(fs.existsSync(path.join(__dirname, '..', 'agent-kit', r)), r).toBe(true);
    for (const m of html.matchAll(/(?:src|href)="(\.\.\/[^"]+)"/g)) expect(fs.existsSync(path.join(__dirname, '..', 'agent-kit', 'examples', m[1])), m[1]).toBe(true);
    for (const f of fs.readFileSync(path.join(__dirname, '..', 'agent-kit', 'fonts', 'fonts.css'), 'utf8').matchAll(/url\(([^)]+\.woff2)\)/g)) expect(fs.existsSync(path.join(__dirname, '..', 'agent-kit', 'fonts', f[1])), f[1]).toBe(true);
  });
  test('DESIGN.md lists every token from the live tokens and every sprite icon', () => {
    const d = kit('DESIGN.md'), css = read('dist/tokens.css');
    for (const m of css.matchAll(/^\s*(--[a-z0-9-]+):/gm)) if (!/-rgb$/.test(m[1])) expect(d, m[1]).toContain('`' + m[1] + '`');
    for (const m of read('icons/sprite.svg').matchAll(/id="i-([a-z0-9-]+)"/g)) expect(d, m[1]).toContain('`' + m[1] + '`');
  });
  test('every me- class and ME.* helper the guide names really exists (the guide cannot rot)', () => {
    const d = kit('DESIGN.md'), css = read('monoedge.css'), js = read('monoedge.js');
    const classes = new Set([...d.matchAll(/\.?\b(me-[a-z][a-z0-9-]*)/g)].map(m => m[1]));
    const elements = new Set(['me-icon', 'me-chart', 'me-scroll', 'me-date', 'me-combobox', 'me-switch']);
    for (const c of classes) if (!elements.has(c)) expect(css.includes(c) || read('monoedge-elements.js').includes(c), c).toBe(true);
    for (const m of d.matchAll(/ME\.([a-zA-Z]+)\(/g)) expect(js, 'ME.' + m[1]).toMatch(new RegExp('\\b' + m[1] + '\\b'));
  });
  test('the guide and the starter both say body needs class="me"', () => {
    expect(kit('DESIGN.md')).toMatch(/<body class="me">/); expect(kit('examples/starter.html')).toMatch(/<body class="me">/);
  });
  test('the rules are all there: 16 numbered hard rules', () => {
    const sec = kit('DESIGN.md').split('## 2. Hard rules')[1].split('\n## 3.')[0];
    expect([...sec.matchAll(/^(\d+)\. \*\*/gm)].length).toBe(16);
  });
});

test.describe('starter page', () => {
  const starter = page => page.goto(url('agent-kit/examples/starter.html'));
  test('loads with no errors and the elements, chart, and icons render', async ({ page }) => {
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await starter(page);
    await expect(page.locator('me-chart svg')).toBeVisible();
    await expect(page.locator('me-switch button[role=switch]')).toBeVisible();
    await expect(page.locator('#open-dlg')).toBeVisible();
    expect(errs.filter(e => !/googleapis|gstatic|ERR_|Failed to load resource/.test(e))).toEqual([]);
  });
  test('the dialog opens, the date picker works, and Save validates', async ({ page }) => {
    await starter(page);
    await page.click('#open-dlg'); await expect(page.locator('#dlg')).toBeVisible();
    await page.click('me-date button[aria-label="Choose date"]'); await expect(page.locator('.me-cal:popover-open')).toBeVisible();
    await page.keyboard.press('Escape'); await page.click('[data-close]');
    await page.click('#save'); await expect(page.locator('#f-name .me-error-msg')).toBeVisible();
  });
  test('it obeys the rules it teaches: radius <= 4px, no box-shadow on panels or dialogs, no hex colours in page CSS', async ({ page }) => {
    await starter(page);
    const bad = await page.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(e); if (cs.display === 'none') continue;
        for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) if (parseFloat(cs[p]) > 4) out.push(e.tagName + '.' + e.className + ' ' + p + ' ' + cs[p]);
      }
      return out;
    });
    expect(bad).toEqual([]);
    expect(kit('examples/starter.html').match(/#[0-9a-fA-F]{3,8}\b(?!["'\w-])/g)?.filter(h => !/^#(i-|f-|dlg|sp|chart|theme|name|save|open)/.test(h)) ?? []).toEqual([]);
  });
  for (const theme of ['dark', 'light']) test(`axe ${theme}`, async ({ page }) => {
    await starter(page); await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme); await page.waitForTimeout(400);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
